"""사람인 Open API adapter — https://oapi.saramin.co.kr/guide/job-search"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from app.config import settings
from app.jobs.base import NormalizedJob


class SaraminApiError(RuntimeError):
    pass


def _text(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, dict):
        for key in ("name", "text", "#text"):
            if value.get(key):
                return str(value[key]).strip() or None
        return None
    text = str(value).strip()
    return text or None


def _from_unix(ts) -> datetime | None:
    if ts in (None, "", 0, "0"):
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc)
    except (TypeError, ValueError, OSError):
        return None


def _map_job(raw: dict) -> NormalizedJob | None:
    job_id = str(raw.get("id") or "").strip()
    if not job_id:
        return None

    position = raw.get("position") or {}
    company = raw.get("company") or {}
    company_detail = company.get("detail") if isinstance(company, dict) else None
    company_name = (
        _text(company_detail.get("name") if isinstance(company_detail, dict) else None)
        or _text(company.get("name") if isinstance(company, dict) else None)
        or "미상"
    )

    title = _text(position.get("title")) or "제목 없음"
    location = _text(position.get("location"))
    employment_type = _text(position.get("job-type"))
    experience = _text(position.get("experience-level"))
    job_code = _text(position.get("job-code"))
    keyword = _text(raw.get("keyword"))
    skills = ", ".join(part for part in [job_code, keyword] if part) or None
    salary = _text(raw.get("salary"))
    education = _text(position.get("required-education-level"))
    close_type = _text(raw.get("close-type"))

    summary_parts = [p for p in [experience, employment_type, location, salary] if p]
    summary = " · ".join(summary_parts) if summary_parts else None

    desc_lines = []
    if education:
        desc_lines.append(f"학력: {education}")
    if salary:
        desc_lines.append(f"급여: {salary}")
    if close_type:
        desc_lines.append(f"마감: {close_type}")
    if keyword:
        desc_lines.append(f"키워드: {keyword}")

    return NormalizedJob(
        source="saramin",
        external_id=job_id,
        title=title,
        company=company_name,
        location=location,
        experience=experience,
        employment_type=employment_type,
        skills=skills,
        summary=summary,
        description="\n".join(desc_lines) if desc_lines else summary,
        url=_text(raw.get("url")),
        posted_at=_from_unix(raw.get("posting-timestamp")),
    )


def fetch_jobs(keywords: str | None = None, count: int | None = None) -> list[NormalizedJob]:
    api_key = (settings.saramin_api_key or "").strip()
    if not api_key:
        return []

    keywords = (keywords or settings.jobs_keywords or "개발자").strip()
    count = min(max(int(count or settings.jobs_fetch_count or 50), 1), 110)

    params: dict[str, str | int] = {
        "access-key": api_key,
        "keywords": keywords,
        "start": 0,
        "count": count,
        "sort": "pd",
        "fields": "posting-date,expiration-date,keyword-code,count",
    }
    job_mid = (settings.saramin_job_mid_cd or "").strip()
    if job_mid:
        params["job_mid_cd"] = job_mid

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                settings.saramin_api_url,
                params=params,
                headers={"Accept": "application/json"},
            )
    except httpx.HTTPError as exc:
        raise SaraminApiError(f"사람인 API 네트워크 오류: {exc}") from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise SaraminApiError(f"사람인 API 응답 파싱 실패 (HTTP {response.status_code})") from exc

    if isinstance(payload, dict) and "code" in payload and "jobs" not in payload:
        raise SaraminApiError(f"사람인 API 오류: {payload.get('message') or payload}")

    if response.status_code >= 400:
        raise SaraminApiError(f"사람인 API HTTP {response.status_code}: {payload}")

    jobs_block = payload.get("jobs") if isinstance(payload, dict) else None
    raw_jobs = []
    if isinstance(jobs_block, dict):
        raw_jobs = jobs_block.get("job") or []
    elif isinstance(payload, list):
        raw_jobs = payload
    if isinstance(raw_jobs, dict):
        raw_jobs = [raw_jobs]

    mapped: list[NormalizedJob] = []
    for raw in raw_jobs:
        if not isinstance(raw, dict):
            continue
        # active=0 은 마감 공고
        if str(raw.get("active", "1")) in {"0", "false", "False"}:
            continue
        item = _map_job(raw)
        if item:
            mapped.append(item)
    return mapped

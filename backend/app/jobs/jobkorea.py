"""잡코리아 파트너 API adapter.

승인 후 발급되는 고유 호출링크(XML/JSON)를 JOBKOREA_API_URL 에 설정합니다.
공식 안내: https://www.jobkorea.co.kr/service/api
"""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.jobs.base import NormalizedJob


class JobKoreaApiError(RuntimeError):
    pass


ID_TAGS = ("GI_No", "GiNo", "Job_No", "JobNo", "id", "ID", "Rec_Idx", "Gno")
TITLE_TAGS = ("GI_Title", "GiTitle", "Title", "Job_Title", "Subject", "title")
COMPANY_TAGS = ("C_Name", "CName", "Company", "CompanyName", "Co_Name", "name")
LOCATION_TAGS = ("Work_Local", "WorkLocal", "Area", "Local", "Region", "location")
CAREER_TAGS = ("GI_Career", "Career", "Experience", "career")
TYPE_TAGS = ("GI_Type", "Job_Type", "Emp_Type", "EmployType", "job_type")
SKILL_TAGS = ("GI_Part", "Part", "Job_Part", "Keyword", "Keywords", "Skill", "Industry")
URL_TAGS = ("URL", "Url", "Gi_Url", "Detail_URL", "DetailUrl", "Link", "href")
DATE_TAGS = ("Reg_Dt", "RegDt", "W_Date", "WDate", "Post_Date", "PostDate", "Date")
SUMMARY_TAGS = ("Pay", "Salary", "Condition", "Summary", "Gi_Content")


def _local(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def _child_text(node: ET.Element, names: tuple[str, ...]) -> str | None:
    wanted = {n.lower() for n in names}
    for child in list(node):
        if _local(child.tag).lower() in wanted:
            text = "".join(child.itertext()).strip()
            if text:
                return text
    # attribute fallback
    for key, value in node.attrib.items():
        if _local(key).lower() in wanted and str(value).strip():
            return str(value).strip()
    return None


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            dt = datetime.strptime(text[:19] if fmt.startswith("%Y-%m-%d %H") else text[:10], fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    try:
        return datetime.fromtimestamp(int(text), tz=timezone.utc)
    except (TypeError, ValueError, OSError):
        return None


def _map_xml_job(node: ET.Element) -> NormalizedJob | None:
    external_id = _child_text(node, ID_TAGS)
    title = _child_text(node, TITLE_TAGS)
    company = _child_text(node, COMPANY_TAGS)
    if not title or not company:
        return None
    if not external_id:
        external_id = f"{company}:{title}"[:100]

    location = _child_text(node, LOCATION_TAGS)
    experience = _child_text(node, CAREER_TAGS)
    employment_type = _child_text(node, TYPE_TAGS)
    skills = _child_text(node, SKILL_TAGS)
    url = _child_text(node, URL_TAGS)
    extra = _child_text(node, SUMMARY_TAGS)
    summary_parts = [p for p in [experience, employment_type, location, extra] if p]

    return NormalizedJob(
        source="jobkorea",
        external_id=external_id,
        title=title,
        company=company,
        location=location,
        experience=experience,
        employment_type=employment_type,
        skills=skills,
        summary=" · ".join(summary_parts) if summary_parts else None,
        description=extra or None,
        url=url,
        posted_at=_parse_date(_child_text(node, DATE_TAGS)),
    )


def _iter_job_nodes(root: ET.Element) -> list[ET.Element]:
    job_like = []
    for node in root.iter():
        name = _local(node.tag).lower()
        if name in {"job", "gi", "item", "recruit", "list"}:
            # leaf-ish job rows usually contain a title-like child
            if any(_local(c.tag).lower() in {t.lower() for t in TITLE_TAGS} for c in list(node)):
                job_like.append(node)
    return job_like


def _map_json_job(raw: dict, index: int) -> NormalizedJob | None:
    def pick(*keys: str) -> str | None:
        lower = {k.lower(): k for k in raw}
        for key in keys:
            real = lower.get(key.lower())
            if real is None:
                continue
            value = raw.get(real)
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        return None

    title = pick(*TITLE_TAGS)
    company = pick(*COMPANY_TAGS)
    if not title or not company:
        return None
    external_id = pick(*ID_TAGS) or f"jk-{index}-{company}:{title}"[:100]
    return NormalizedJob(
        source="jobkorea",
        external_id=external_id,
        title=title,
        company=company,
        location=pick(*LOCATION_TAGS),
        experience=pick(*CAREER_TAGS),
        employment_type=pick(*TYPE_TAGS),
        skills=pick(*SKILL_TAGS),
        summary=pick(*SUMMARY_TAGS),
        description=pick(*SUMMARY_TAGS),
        url=pick(*URL_TAGS),
        posted_at=_parse_date(pick(*DATE_TAGS)),
    )


def _parse_payload(content: str, content_type: str) -> list[NormalizedJob]:
    ctype = (content_type or "").lower()
    text = content.lstrip("\ufeff").strip()
    if not text:
        return []

    if "json" in ctype or text.startswith("{") or text.startswith("["):
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            raise JobKoreaApiError("잡코리아 API JSON 파싱 실패") from exc
        rows = payload
        if isinstance(payload, dict):
            for key in ("Jobs", "jobs", "Job", "job", "items", "data", "list"):
                if key in payload:
                    rows = payload[key]
                    break
        if isinstance(rows, dict):
            rows = [rows]
        if not isinstance(rows, list):
            raise JobKoreaApiError("잡코리아 API JSON 구조를 해석할 수 없습니다.")
        mapped = []
        for idx, row in enumerate(rows):
            if isinstance(row, dict):
                item = _map_json_job(row, idx)
                if item:
                    mapped.append(item)
        return mapped

    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        raise JobKoreaApiError("잡코리아 API XML 파싱 실패") from exc

    mapped = []
    for node in _iter_job_nodes(root):
        item = _map_xml_job(node)
        if item:
            mapped.append(item)
    if not mapped and _child_text(root, TITLE_TAGS):
        item = _map_xml_job(root)
        if item:
            mapped.append(item)
    return mapped


def fetch_jobs(keywords: str | None = None, count: int | None = None) -> list[NormalizedJob]:
    api_url = (settings.jobkorea_api_url or "").strip()
    if not api_url:
        return []

    keywords = (keywords or settings.jobs_keywords or "개발자").strip()
    count = min(max(int(count or settings.jobs_fetch_count or 50), 1), 500)

    params = {}
    # 파트너 가이드에 따라 파라미터가 다를 수 있어 흔한 키워드 파라미터를 함께 전달
    if keywords:
        params.update({"keyword": keywords, "keywords": keywords, "schTxt": keywords})

    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(
                api_url,
                params=params or None,
                headers={"Accept": "application/xml, application/json, text/xml, */*"},
            )
    except httpx.HTTPError as exc:
        raise JobKoreaApiError(f"잡코리아 API 네트워크 오류: {exc}") from exc

    if response.status_code >= 400:
        raise JobKoreaApiError(f"잡코리아 API HTTP {response.status_code}")

    jobs = _parse_payload(response.text, response.headers.get("content-type", ""))
    if keywords:
        lowered = keywords.lower()
        filtered = [
            job
            for job in jobs
            if lowered in (job.title or "").lower()
            or lowered in (job.skills or "").lower()
            or lowered in (job.summary or "").lower()
            or lowered in (job.description or "").lower()
            or "개발" in (job.title or "")
            or "개발" in (job.skills or "")
        ]
        # 필터 결과가 있으면 사용, 없으면 원본(파트너 피드가 이미 조건 설정된 경우)
        if filtered:
            jobs = filtered
    return jobs[:count]

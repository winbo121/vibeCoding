from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.jobs import jobkorea, sample, saramin
from app.jobs.base import NormalizedJob
from app.jobs.jobkorea import JobKoreaApiError
from app.jobs.saramin import SaraminApiError
from app.models import JobPosting


def source_status() -> list[dict]:
    return [
        {
            "source": "sample",
            "label": "샘플",
            "configured": True,
            "ready": True,
            "hint": "데모용 개발자 공고",
        },
        {
            "source": "saramin",
            "label": "사람인",
            "configured": bool((settings.saramin_api_key or "").strip()),
            "ready": bool((settings.saramin_api_key or "").strip()),
            "hint": "backend/.env 에 SARAMIN_API_KEY(access-key) 설정",
        },
        {
            "source": "jobkorea",
            "label": "잡코리아",
            "configured": bool((settings.jobkorea_api_url or "").strip()),
            "ready": bool((settings.jobkorea_api_url or "").strip()),
            "hint": "backend/.env 에 JOBKOREA_API_URL(승인 호출링크) 설정",
        },
    ]


def _fetch_by_source(
    source: str,
    keywords: str | None = None,
    count: int | None = None,
) -> list[NormalizedJob]:
    if source == "sample":
        return sample.fetch_jobs()
    if source == "saramin":
        return saramin.fetch_jobs(keywords=keywords, count=count)
    if source == "jobkorea":
        return jobkorea.fetch_jobs(keywords=keywords, count=count)
    raise ValueError(f"지원하지 않는 소스입니다: {source}")


def upsert_jobs(db: Session, jobs: list[NormalizedJob]) -> tuple[int, int]:
    inserted = 0
    updated = 0
    now = datetime.now(timezone.utc)
    for job in jobs:
        row = db.scalar(
            select(JobPosting).where(
                JobPosting.source == job.source,
                JobPosting.external_id == job.external_id,
            )
        )
        fields = {
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "experience": job.experience,
            "employment_type": job.employment_type,
            "skills": job.skills,
            "summary": job.summary,
            "description": job.description,
            "url": job.url,
            "posted_at": job.posted_at,
            "collected_at": now,
            "is_active": True,
        }
        if row:
            for key, value in fields.items():
                setattr(row, key, value)
            updated += 1
        else:
            db.add(
                JobPosting(
                    source=job.source,
                    external_id=job.external_id,
                    **fields,
                )
            )
            inserted += 1
    db.commit()
    return inserted, updated


def sync_jobs(
    db: Session,
    source: str = "sample",
    keywords: str | None = None,
    count: int | None = None,
) -> dict:
    if source == "saramin" and not (settings.saramin_api_key or "").strip():
        return {
            "source": source,
            "inserted": 0,
            "updated": 0,
            "total": 0,
            "message": "사람인 API 키가 없습니다. backend/.env 에 SARAMIN_API_KEY 를 넣고 서버를 재시작하세요.",
        }
    if source == "jobkorea" and not (settings.jobkorea_api_url or "").strip():
        return {
            "source": source,
            "inserted": 0,
            "updated": 0,
            "total": 0,
            "message": "잡코리아 호출링크가 없습니다. backend/.env 에 JOBKOREA_API_URL 을 넣고 서버를 재시작하세요.",
        }

    try:
        jobs = _fetch_by_source(source, keywords=keywords, count=count)
    except (SaraminApiError, JobKoreaApiError) as exc:
        raise RuntimeError(str(exc)) from exc

    if not jobs:
        return {
            "source": source,
            "inserted": 0,
            "updated": 0,
            "total": 0,
            "message": f"{source}에서 가져온 공고가 없습니다. 키워드/권한/호출링크를 확인하세요.",
        }
    inserted, updated = upsert_jobs(db, jobs)
    return {
        "source": source,
        "inserted": inserted,
        "updated": updated,
        "total": len(jobs),
        "message": f"{source}에서 {len(jobs)}건 동기화 완료 (신규 {inserted}, 갱신 {updated})",
    }


def sync_all_configured(
    db: Session,
    keywords: str | None = None,
    count: int | None = None,
) -> dict:
    results = []
    total_inserted = 0
    total_updated = 0
    total_jobs = 0
    for source in ("saramin", "jobkorea"):
        status = next(s for s in source_status() if s["source"] == source)
        if not status["ready"]:
            results.append(f"{source}: 미설정(건너뜀)")
            continue
        try:
            result = sync_jobs(db, source=source, keywords=keywords, count=count)
            total_inserted += result["inserted"]
            total_updated += result["updated"]
            total_jobs += result["total"]
            results.append(result["message"])
        except RuntimeError as exc:
            results.append(f"{source}: 실패 - {exc}")
    return {
        "source": "official",
        "inserted": total_inserted,
        "updated": total_updated,
        "total": total_jobs,
        "message": " | ".join(results) if results else "설정된 공식 API가 없습니다.",
    }

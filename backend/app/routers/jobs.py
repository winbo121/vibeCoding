from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_admin, get_current_user, is_admin
from app.database import get_db
from app.jobs.matching import parse_skills, score_job
from app.jobs.service import source_status, sync_all_configured, sync_jobs
from app.models import JobPosting, User
from app.schemas import JobPostingOut, JobSyncResult

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobSourceStatus(BaseModel):
    source: str
    label: str
    configured: bool
    ready: bool
    hint: str


def _to_out(job: JobPosting, score: int = 0, matched: list[str] | None = None) -> JobPostingOut:
    data = JobPostingOut.model_validate(job)
    data.match_score = score
    data.matched_skills = matched or []
    return data


@router.get("/sources", response_model=list[JobSourceStatus])
def list_job_sources(_: User = Depends(get_current_user)):
    return source_status()


@router.get("", response_model=list[JobPostingOut])
def list_jobs(
    q: str | None = Query(default=None, description="제목/회사/스킬 검색"),
    source: str | None = Query(default=None, description="sample|saramin|jobkorea"),
    match_only: bool | None = Query(
        default=None,
        description="내 기술스택과 맞는 공고만 (일반 유저+스택 있으면 기본 true)",
    ),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(JobPosting).where(JobPosting.is_active.is_(True))
    if source:
        stmt = stmt.where(JobPosting.source == source)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                JobPosting.title.ilike(like),
                JobPosting.company.ilike(like),
                JobPosting.skills.ilike(like),
                JobPosting.location.ilike(like),
                JobPosting.summary.ilike(like),
            )
        )
    stmt = stmt.order_by(JobPosting.posted_at.desc().nullslast(), JobPosting.id.desc())
    rows = list(db.scalars(stmt).all())

    # 관리자: 항상 전체 공고 (매칭 필터/정렬 없음)
    if is_admin(user):
        return [_to_out(job) for job in rows]

    user_skills = parse_skills(getattr(user, "skills", None))
    # 스택이 있으면 기본으로 맞춤만 노출 (명시적으로 false일 때만 전체)
    apply_match_filter = bool(user_skills) if match_only is None else bool(match_only)

    scored: list[JobPostingOut] = []
    for job in rows:
        score, matched = score_job(job, user_skills)
        if apply_match_filter and user_skills and score <= 0:
            continue
        scored.append(_to_out(job, score, matched))

    if user_skills:
        scored.sort(
            key=lambda item: (
                item.match_score,
                item.posted_at.timestamp() if item.posted_at else 0,
                item.id,
            ),
            reverse=True,
        )
    return scored


@router.post("/sync", response_model=JobSyncResult)
def sync_job_postings(
    source: str = Query(default="sample", pattern="^(sample|saramin|jobkorea|official)$"),
    keywords: str | None = Query(default=None, description="검색 키워드(기본: 개발자)"),
    count: int | None = Query(default=None, ge=1, le=110, description="가져올 건수"),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        if source == "official":
            result = sync_all_configured(db, keywords=keywords, count=count)
        else:
            result = sync_jobs(db, source=source, keywords=keywords, count=count)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return result


@router.get("/{job_id}", response_model=JobPostingOut)
def get_job(job_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.get(JobPosting, job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="채용공고를 찾을 수 없습니다.")
    if is_admin(user):
        return _to_out(job)
    user_skills = parse_skills(getattr(user, "skills", None))
    score, matched = score_job(job, user_skills)
    return _to_out(job, score, matched)

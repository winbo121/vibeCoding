from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.jobs.matching import parse_skills
from app.models import User
from app.skills_ai import canonical_skill_name, skill_dictionary, suggest_skills

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("/stats")
def skill_stats(db: Session = Depends(get_db)):
    """
    가입 회원(관리자 제외) 기술스택 비율.
    percent = 해당 기술을 가진 회원 수 / 기술스택을 등록한 회원 수 * 100
    """
    rows = db.scalars(
        select(User).where(User.role != "admin", User.is_active.is_(True)).order_by(User.id)
    ).all()

    total_members = len(rows)
    skill_users = 0
    counter: Counter[str] = Counter()

    for user in rows:
        skills = parse_skills(getattr(user, "skills", None))
        if not skills:
            continue
        skill_users += 1
        seen: set[str] = set()
        for raw in skills:
            name = canonical_skill_name(raw)
            if not name:
                continue
            key = name.casefold()
            if key in seen:
                continue
            seen.add(key)
            counter[name] += 1

    items = []
    for name, count in counter.most_common(20):
        percent = round((count / skill_users) * 100, 1) if skill_users else 0.0
        items.append(
            {
                "skill": name,
                "count": count,
                "percent": percent,
            }
        )

    return {
        "total_members": total_members,
        "members_with_skills": skill_users,
        "items": items,
    }


@router.get("/dictionary")
def get_skill_dictionary(_: User = Depends(get_current_user)):
    """표준 기술명 + 유사용어(한글/별칭) 사전."""
    return skill_dictionary()


@router.get("/suggest")
def get_skill_suggestions(
    q: str | None = Query(default=None, description="입력 중인 단어"),
    limit: int = Query(default=12, ge=1, le=30),
    _: User = Depends(get_current_user),
):
    """기술스택 자동완성 / 유사 용어 제안."""
    return suggest_skills(q, limit=limit)

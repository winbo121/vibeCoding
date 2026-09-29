from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.models import User
from app.skills_ai import skill_dictionary, suggest_skills

router = APIRouter(prefix="/skills", tags=["skills"])


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

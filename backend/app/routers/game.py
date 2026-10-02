"""비행 슈팅 점수. 한 판이 끝날 때마다 사용자 점수에 더하고 누적 순위를 돌려줍니다."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import GameRun, User

router = APIRouter(prefix="/game", tags=["game"])


class ScoreIn(BaseModel):
    score: int = Field(ge=0, le=1_000_000)


def _ranking(db: Session, user: User, limit: int = 20) -> dict:
    totals = db.execute(
        select(
            GameRun.user_id,
            func.sum(GameRun.score),
            func.max(GameRun.score),
            func.count(GameRun.id),
        )
        .group_by(GameRun.user_id)
        .order_by(func.sum(GameRun.score).desc(), func.max(GameRun.score).desc())
    ).all()
    users = {
        row.id: row
        for row in db.scalars(select(User).where(User.id.in_([item[0] for item in totals] or [0]))).all()
    }
    items = []
    mine = None
    for index, (user_id, total, best, plays) in enumerate(totals, start=1):
        person = users.get(user_id)
        row = {
            "rank": index,
            "user_id": user_id,
            "username": person.username if person else "",
            "name": (person.name if person else "") or (person.username if person else ""),
            "total": int(total or 0),
            "best": int(best or 0),
            "plays": int(plays or 0),
        }
        if index <= limit:
            items.append(row)
        if user_id == user.id:
            mine = row
    if mine is None:
        mine = {
            "rank": None,
            "user_id": user.id,
            "username": user.username,
            "name": user.name or user.username,
            "total": 0,
            "best": 0,
            "plays": 0,
        }
    return {"items": items, "mine": mine}


@router.get("/ranking")
def game_ranking(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _ranking(db, user)


@router.post("/scores")
def submit_score(body: ScoreIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.add(GameRun(user_id=user.id, score=body.score))
    db.commit()
    return _ranking(db, user)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Faq, User
from app.schemas import FaqCreate, FaqOut, FaqUpdate

router = APIRouter(prefix="/faqs", tags=["faqs"])


@router.get("", response_model=list[FaqOut])
def list_faqs(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Faq).order_by(Faq.sort_order, Faq.id)).all()


@router.post("", response_model=FaqOut, status_code=status.HTTP_201_CREATED)
def create_faq(payload: FaqCreate, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    faq = Faq(**payload.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


@router.put("/{faq_id}", response_model=FaqOut)
def update_faq(
    faq_id: int,
    payload: FaqUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    faq = db.get(Faq, faq_id)
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ를 찾을 수 없습니다.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(faq, key, value)
    db.commit()
    db.refresh(faq)
    return faq


@router.delete("/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faq(faq_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    faq = db.get(Faq, faq_id)
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ를 찾을 수 없습니다.")
    db.delete(faq)
    db.commit()

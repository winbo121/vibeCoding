from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_admin, hash_password
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.skills_ai import normalize_skills

router = APIRouter(prefix="/users", tags=["users"])


def clear_profile(user: User) -> None:
    user.career_years = None
    user.skills = None
    user.gender = None
    user.company = None
    user.home_address = None


@router.get("", response_model=list[UserOut])
def list_users(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, _: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    role = payload.role
    skills = None if role == "admin" else normalize_skills(payload.skills)
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        name=payload.name,
        email=payload.email,
        role=role,
        is_active=payload.is_active,
        career_years=None if role == "admin" else payload.career_years,
        skills=skills,
        gender=None if role == "admin" else payload.gender,
        company=None if role == "admin" else payload.company,
        home_address=None if role == "admin" else payload.home_address,
    )
    if role == "admin":
        clear_profile(user)
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.") from exc
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    else:
        data.pop("password", None)

    # Prevent demoting the last admin / self-lock accidentally when editing own role away from admin.
    if "role" in data and user.id == current.id and data["role"] != "admin":
        raise HTTPException(status_code=400, detail="본인 계정의 관리자 권한은 해제할 수 없습니다.")

    next_role = data.get("role", user.role)
    if "skills" in data and next_role != "admin":
        data["skills"] = normalize_skills(data.get("skills"))
    for key, value in data.items():
        setattr(user, key, value)

    # 관리자로 바꾸면 개발자 프로필은 전부 비움
    if next_role == "admin":
        clear_profile(user)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="본인 계정은 삭제할 수 없습니다.")
    db.delete(user)
    db.commit()

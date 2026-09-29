from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import ADMIN_MENU_CODES, create_access_token, get_current_user, is_admin, verify_password
from app.database import get_db
from app.models import Program, User, UserProgram
from app.schemas import LoginIn, ProfileUpdate, ProgramOut, TokenOut, UserOut
from app.skills_ai import normalize_skills
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="비활성 계정입니다.")
    role = getattr(user, "role", "user") or "user"
    return TokenOut(access_token=create_access_token(user.id, user.username, role))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """본인 프로필 수정. 관리자 계정은 개발자 프로필을 갖지 않음."""
    data = payload.model_dump(exclude_unset=True)
    if "skills" in data:
        data["skills"] = normalize_skills(data.get("skills"))
    for key, value in data.items():
        setattr(user, key, value)

    if is_admin(user):
        user.career_years = None
        user.skills = None
        user.gender = None
        user.company = None

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/my-programs", response_model=list[ProgramOut])
def my_programs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Program)
        .join(UserProgram, UserProgram.program_id == Program.id)
        .where(UserProgram.user_id == user.id, Program.is_active.is_(True))
        .order_by(Program.sort_order, Program.id)
    ).all()

    if not is_admin(user):
        rows = [p for p in rows if p.code not in ADMIN_MENU_CODES]
    return rows

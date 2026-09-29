from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.auth import ADMIN_MENU_CODES, get_current_admin
from app.database import get_db
from app.models import Program, User, UserProgram
from app.schemas import ProgramCreate, ProgramOut, ProgramUpdate, UserProgramAssign, UserProgramOut

router = APIRouter(tags=["programs"])


@router.get("/programs", response_model=list[ProgramOut])
def list_programs(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.scalars(select(Program).order_by(Program.sort_order, Program.id)).all()


@router.post("/programs", response_model=ProgramOut, status_code=status.HTTP_201_CREATED)
def create_program(payload: ProgramCreate, _: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    program = Program(**payload.model_dump())
    db.add(program)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 존재하는 프로그램 코드입니다.") from exc
    db.refresh(program)
    return program


@router.put("/programs/{program_id}", response_model=ProgramOut)
def update_program(
    program_id: int,
    payload: ProgramUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    program = db.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=404, detail="프로그램을 찾을 수 없습니다.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(program, key, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="프로그램 코드가 중복됩니다.") from exc
    db.refresh(program)
    return program


@router.delete("/programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(program_id: int, _: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    program = db.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=404, detail="프로그램을 찾을 수 없습니다.")
    db.delete(program)
    db.commit()


@router.get("/user-programs", response_model=list[UserProgramOut])
def list_user_programs(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.scalars(
        select(User).options(selectinload(User.programs).selectinload(UserProgram.program)).order_by(User.id)
    ).all()
    result = []
    for user in users:
        programs = [up.program for up in user.programs if up.program]
        programs.sort(key=lambda p: (p.sort_order, p.id))
        result.append(UserProgramOut(user_id=user.id, username=user.username, programs=programs))
    return result


@router.put("/user-programs/{user_id}", response_model=UserProgramOut)
def assign_user_programs(
    user_id: int,
    payload: UserProgramAssign,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    programs = db.scalars(select(Program).where(Program.id.in_(payload.program_ids))).all() if payload.program_ids else []
    if len(programs) != len(set(payload.program_ids)):
        raise HTTPException(status_code=400, detail="존재하지 않는 프로그램이 포함되어 있습니다.")

    if getattr(user, "role", "user") != "admin":
        admin_menus = [p.name for p in programs if p.code in ADMIN_MENU_CODES]
        if admin_menus:
            raise HTTPException(
                status_code=400,
                detail="일반 사용자에게는 사용자관리/메뉴관리를 할당할 수 없습니다.",
            )

    existing = db.scalars(select(UserProgram).where(UserProgram.user_id == user_id)).all()
    for row in existing:
        db.delete(row)
    db.flush()
    for program in programs:
        db.add(UserProgram(user_id=user_id, program_id=program.id))
    db.commit()

    programs_sorted = sorted(programs, key=lambda p: (p.sort_order, p.id))
    return UserProgramOut(user_id=user.id, username=user.username, programs=programs_sorted)

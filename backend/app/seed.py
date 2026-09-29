from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.config import settings
from app.jobs.service import sync_jobs
from app.models import Faq, JobPosting, Program, User, UserProgram


DEFAULT_PROGRAMS = [
    {"code": "USERS", "name": "사용자관리", "path": "/users", "description": "사용자 CRUD", "sort_order": 10},
    {
        "code": "USER_PROGRAMS",
        "name": "메뉴관리",
        "path": "/user-programs",
        "description": "사용자별 메뉴 권한",
        "sort_order": 20,
    },
    {
        "code": "JOBS",
        "name": "입사지원 찾기",
        "path": "/jobs",
        "description": "개발자 채용공고 조회 (샘플/공식 API)",
        "sort_order": 25,
    },
    {"code": "FAQS", "name": "FAQ", "path": "/faqs", "description": "FAQ CRUD", "sort_order": 30},
    {"code": "BOARD", "name": "게시판", "path": "/board", "description": "게시판 CRUD/파일", "sort_order": 40},
]

ADMIN_ONLY_CODES = {"USERS", "USER_PROGRAMS"}
USER_MENU_CODES = {"FAQS", "BOARD", "JOBS"}


def _looks_broken(text: str | None) -> bool:
    if not text:
        return False
    has_hangul = any("가" <= ch <= "힣" for ch in text)
    return ("???" in text) or (text.count("?") >= 2 and not has_hangul)


def ensure_schema(db: Session) -> None:
    db.execute(
        text(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
            """
        )
    )
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS career_years INTEGER"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS skills VARCHAR(500)"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)"))
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(200)"))
    db.commit()


def _ensure_user_programs(db: Session, user: User, codes: set[str], program_map: dict[str, Program]) -> None:
    for code in codes:
        program = program_map.get(code)
        if not program:
            continue
        exists = db.scalar(
            select(UserProgram).where(
                UserProgram.user_id == user.id,
                UserProgram.program_id == program.id,
            )
        )
        if not exists:
            db.add(UserProgram(user_id=user.id, program_id=program.id))


def seed_data(db: Session) -> None:
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    ensure_schema(db)

    admin = db.scalar(select(User).where(User.username == "admin"))
    if not admin:
        admin = User(
            username="admin",
            password_hash=hash_password("1234"),
            name="관리자",
            email="admin@vibecoding.local",
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.flush()
    else:
        if _looks_broken(admin.name) or not admin.name:
            admin.name = "관리자"
        admin.role = "admin"
        admin.career_years = None
        admin.skills = None
        admin.gender = None
        admin.company = None

    normal = db.scalar(select(User).where(User.username == "user"))
    if not normal:
        normal = User(
            username="user",
            password_hash=hash_password("1234"),
            name="일반사용자",
            email="user@vibecoding.local",
            role="user",
            is_active=True,
            career_years=3,
            skills="Python, FastAPI, PostgreSQL",
            gender="male",
            company="VibeCoding",
        )
        db.add(normal)
        db.flush()
    else:
        if not getattr(normal, "role", None):
            normal.role = "user"
        # 데모용: 스택이 비어 있으면 샘플 스택을 채워 맞춤 공고가 보이도록 함
        if not (getattr(normal, "skills", None) or "").strip():
            normal.skills = "Python, FastAPI, PostgreSQL"
            if getattr(normal, "career_years", None) is None:
                normal.career_years = 3

    program_map: dict[str, Program] = {}
    for item in DEFAULT_PROGRAMS:
        program = db.scalar(select(Program).where(Program.code == item["code"]))
        if not program:
            program = Program(**item)
            db.add(program)
            db.flush()
        else:
            program.name = item["name"]
            program.description = item["description"]
            program.path = item["path"]
            program.sort_order = item["sort_order"]
        program_map[item["code"]] = program

    _ensure_user_programs(db, admin, set(program_map.keys()), program_map)
    _ensure_user_programs(db, normal, USER_MENU_CODES, program_map)

    # Remove admin-only menus from normal users if previously assigned.
    for code in ADMIN_ONLY_CODES:
        program = program_map.get(code)
        if not program:
            continue
        for row in db.scalars(
            select(UserProgram).where(
                UserProgram.program_id == program.id,
                UserProgram.user_id != admin.id,
            )
        ).all():
            user = db.get(User, row.user_id)
            if user and getattr(user, "role", "user") != "admin":
                db.delete(row)

    for faq in db.scalars(select(Faq)).all():
        if _looks_broken(faq.question) or _looks_broken(faq.answer):
            db.delete(faq)

    sample = db.scalar(select(Faq).where(Faq.question == "VibeCoding이 무엇인가요?"))
    if not sample:
        db.add(
            Faq(
                question="VibeCoding이 무엇인가요?",
                answer="Python + React + PostgreSQL + Tomcat 기반 풀스택 실습 프로젝트입니다.",
                sort_order=1,
                is_published=True,
            )
        )

    if not db.scalar(select(JobPosting.id).limit(1)):
        sync_jobs(db, source="sample")

    db.commit()

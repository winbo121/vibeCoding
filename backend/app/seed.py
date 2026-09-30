from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.config import settings
from app.jobs.service import sync_jobs
from app.models import BoardPost, Faq, JobPosting, Program, User, UserProgram


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
    {
        "code": "NEARBY_FOOD",
        "name": "회사 주변 맛집",
        "path": "/nearby-food",
        "description": "현직장(관리자는 현위치) 주변 맛집 찾기",
        "sort_order": 28,
    },
    {"code": "BOARD", "name": "게시판", "path": "/board", "description": "게시판 CRUD/파일", "sort_order": 30},
    {"code": "FAQS", "name": "FAQ", "path": "/faqs", "description": "FAQ CRUD", "sort_order": 40},
]

ADMIN_ONLY_CODES = {"USERS", "USER_PROGRAMS"}
USER_MENU_CODES = {"FAQS", "BOARD", "JOBS", "NEARBY_FOOD"}

SAMPLE_FAQS = [
    (
        "로그인은 어떻게 하나요?",
        "관리자는 admin / 1234, 일반 사용자는 user / 1234 입니다. 로그인하면 권한에 맞는 메뉴만 보입니다.",
        2,
    ),
    (
        "집 주소는 어디에 쓰이나요?",
        "마이페이지에서 집 주소를 저장하면 채용 공고의 회사 위치와 집 사이 거리·소요 시간을 볼 수 있습니다.",
        3,
    ),
    (
        "회사 주변 맛집은 어디까지 검색되나요?",
        "기본 반경은 300m입니다. 일반 사용자는 등록한 회사 위치, 관리자는 현재 위치 기준으로 음식점을 찾습니다.",
        4,
    ),
    (
        "기술 스택은 어디서 바꾸나요?",
        "내 정보의 기술 스택을 쉼표로 구분해 저장하면 입사지원 찾기에서 맞는 공고를 우선 보여 줍니다. 예: Python, FastAPI, PostgreSQL",
        5,
    ),
    (
        "게시판에 파일을 올릴 수 있나요?",
        "글 작성 시 파일을 첨부할 수 있고, 상세 화면에서 다운로드할 수 있습니다. 본인과 관리자가 글과 첨부를 수정·삭제할 수 있습니다.",
        6,
    ),
    (
        "관리자만 쓰는 메뉴가 있나요?",
        "사용자관리와 메뉴관리는 관리자 전용입니다. 입사지원 찾기, 회사 주변 맛집, FAQ, 게시판은 일반 사용자도 이용합니다.",
        7,
    ),
]

SAMPLE_POSTS = [
    (
        "admin",
        "[공지] 개발자 쉼터 이용 안내",
        "DevHaven에 오신 것을 환영합니다.\n\n"
        "- 입사지원 찾기: 기술 스택이 맞는 채용 공고\n"
        "- 회사 주변 맛집: 직장 기준 300m 음식점\n"
        "- FAQ / 게시판: 이용 질문과 자유 글\n\n"
        "집 주소를 등록하면 공고마다 집↔회사 거리와 소요 시간이 표시됩니다.",
    ),
    (
        "user",
        "집 주소 넣고 출퇴근 시간 확인해 봤어요",
        "마이페이지에 집 주소를 저장한 뒤 입사지원 찾기를 열어 보니, 회사 위치까지 거리와 시간이 같이 나옵니다.\n"
        "강남·분당 공고를 비교할 때 편해서 다른 분들도 주소부터 넣어 보시면 좋겠습니다.",
    ),
    (
        "admin",
        "점심은 회사 반경 300m부터",
        "회사 주변 맛집은 기본 300m입니다. 너무 넓으면 점심시간에 가기 어려운 곳이 섞여서, 걸어갈 수 있는 거리만 남겼습니다.\n"
        "회사 주소가 비어 있으면 먼저 프로필에 직장을 등록해 주세요.",
    ),
    (
        "user",
        "FastAPI로 올린 게시글 첨부 메모",
        "게시글 작성 화면에서 파일을 같이 올리면 상세에서 바로 받을 수 있습니다.\n"
        "로컬에서는 backend/uploads 에 저장되고, 글 삭제 시 첨부도 함께 지워집니다.",
    ),
    (
        "user",
        "질문) 기술 스택은 쉼표로 적어도 매칭되나요?",
        "Python, FastAPI, PostgreSQL 처럼 쉼표로 적었더니 입사지원 찾기에서 겹치는 공고가 위로 왔습니다.\n"
        "띄어쓰기나 영문 표기만 공고와 비슷하게 맞추면 되는 것 같아요.",
    ),
]


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
    db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address VARCHAR(300)"))
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
            email="admin@devhaven.local",
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.flush()
    else:
        if _looks_broken(admin.name) or not admin.name:
            admin.name = "관리자"
        if (admin.email or "").endswith("@vibecoding.local"):
            admin.email = "admin@devhaven.local"
        admin.role = "admin"
        admin.career_years = None
        admin.skills = None
        admin.gender = None
        admin.company = None
        admin.home_address = None

    normal = db.scalar(select(User).where(User.username == "user"))
    if not normal:
        normal = User(
            username="user",
            password_hash=hash_password("1234"),
            name="일반사용자",
            email="user@devhaven.local",
            role="user",
            is_active=True,
            career_years=3,
            skills="Python, FastAPI, PostgreSQL",
            gender="male",
            company="DevHaven",
        )
        db.add(normal)
        db.flush()
    else:
        if not getattr(normal, "role", None):
            normal.role = "user"
        if (normal.email or "").endswith("@vibecoding.local"):
            normal.email = "user@devhaven.local"
        if (getattr(normal, "company", None) or "") == "VibeCoding":
            normal.company = "DevHaven"
        # 데모용: 스택이 비어 있으면 샘플 스택을 채워 맞춤 공고가 보이도록 함
        if not (getattr(normal, "skills", None) or "").strip():
            normal.skills = "Python, FastAPI, PostgreSQL"
            if getattr(normal, "career_years", None) is None:
                normal.career_years = 3

    # 대시보드 데모용 추가 회원 (없을 때만 생성)
    demo_members = [
        {
            "username": "java_dev",
            "name": "김자바",
            "email": "java@devhaven.local",
            "skills": "Java, Spring Boot, MySQL",
            "career_years": 5,
            "gender": "male",
            "company": "넥스트잡",
        },
        {
            "username": "flutter_dev",
            "name": "이플러터",
            "email": "flutter@devhaven.local",
            "skills": "Flutter, Dart, Firebase",
            "career_years": 2,
            "gender": "female",
            "company": "앱스퀘어",
        },
        {
            "username": "django_dev",
            "name": "박장고",
            "email": "django@devhaven.local",
            "skills": "Python, Django, JavaScript, PostgreSQL",
            "career_years": 4,
            "gender": "male",
            "company": "코드웨이브",
        },
    ]
    for demo in demo_members:
        existing = db.scalar(select(User).where(User.username == demo["username"]))
        if existing:
            continue
        db.add(
            User(
                username=demo["username"],
                password_hash=hash_password("1234"),
                name=demo["name"],
                email=demo["email"],
                role="user",
                is_active=True,
                career_years=demo["career_years"],
                skills=demo["skills"],
                gender=demo["gender"],
                company=demo["company"],
            )
        )
    db.flush()

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

    # 기존 일반 사용자에게도 공통 메뉴(입사지원/맛집 등) 부여
    for u in db.scalars(select(User).where(User.role != "admin")).all():
        _ensure_user_programs(db, u, USER_MENU_CODES, program_map)

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
    if sample:
        sample.question = "DevHaven(개발자 쉼터)이 무엇인가요?"
        sample.answer = "개발자를 위한 쉼터입니다. 채용·주변 맛집·FAQ·게시판을 한곳에서 이용할 수 있습니다."
    else:
        sample = db.scalar(select(Faq).where(Faq.question == "DevHaven(개발자 쉼터)이 무엇인가요?"))
        if not sample:
            db.add(
                Faq(
                    question="DevHaven(개발자 쉼터)이 무엇인가요?",
                    answer="개발자를 위한 쉼터입니다. 채용·주변 맛집·FAQ·게시판을 한곳에서 이용할 수 있습니다.",
                    sort_order=1,
                    is_published=True,
                )
            )

    for question, answer, sort_order in SAMPLE_FAQS:
        if db.scalar(select(Faq).where(Faq.question == question)):
            continue
        db.add(Faq(question=question, answer=answer, sort_order=sort_order, is_published=True))

    author_by_name = {"admin": admin, "user": normal}
    for username, title, content in SAMPLE_POSTS:
        if db.scalar(select(BoardPost).where(BoardPost.title == title)):
            continue
        author = author_by_name[username]
        db.add(BoardPost(title=title, content=content, author_id=author.id))

    if not db.scalar(select(JobPosting.id).limit(1)):
        sync_jobs(db, source="sample")

    db.commit()

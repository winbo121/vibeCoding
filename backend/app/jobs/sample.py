"""Sample developer job adapter (demo data until official APIs are wired)."""

from datetime import datetime, timedelta, timezone

from app.jobs.base import NormalizedJob

KST = timezone(timedelta(hours=9))


def fetch_jobs() -> list[NormalizedJob]:
    now = datetime.now(KST)
    return [
        NormalizedJob(
            source="sample",
            external_id="saramin-demo-1001",
            title="백엔드 개발자 (Python / FastAPI)",
            company="바이브테크",
            location="서울 강남구",
            experience="경력 2~5년",
            employment_type="정규직",
            skills="Python, FastAPI, PostgreSQL, Docker",
            summary="Python 기반 API 서버 개발. REST API 설계·성능 개선 경험 우대.",
            description=(
                "Python/FastAPI로 서비스 API를 설계·구현합니다.\n"
                "- REST API / JWT 인증\n"
                "- PostgreSQL 스키마 설계\n"
                "- Docker 기반 배포 경험 우대"
            ),
            url="https://www.saramin.co.kr/",
            posted_at=now - timedelta(days=1),
        ),
        NormalizedJob(
            source="sample",
            external_id="saramin-demo-1002",
            title="프론트엔드 개발자 (React)",
            company="코드웨이브",
            location="서울 마포구 · 하이브리드",
            experience="경력 1~4년",
            employment_type="정규직",
            skills="React, TypeScript, Bootstrap, Vite",
            summary="React SPA 개발. 컴포넌트 설계·상태관리·반응형 UI 경험자 환영.",
            description=(
                "React 기반 관리자/사용자 화면을 개발합니다.\n"
                "- SPA 라우팅, 폼/테이블 UX\n"
                "- REST API 연동\n"
                "- Bootstrap 또는 자체 디자인 시스템"
            ),
            url="https://www.saramin.co.kr/",
            posted_at=now - timedelta(days=2),
        ),
        NormalizedJob(
            source="sample",
            external_id="jobkorea-demo-2001",
            title="풀스택 개발자 (Java / Spring + React)",
            company="넥스트잡",
            location="경기 성남시 분당구",
            experience="경력 3~7년",
            employment_type="정규직",
            skills="Java, Spring Boot, React, MySQL",
            summary="Spring Boot + React 풀스택. 사내 채용·HR 솔루션 고도화.",
            description=(
                "채용 플랫폼 백오피스/포털을 풀스택으로 개발합니다.\n"
                "- Spring Boot REST API\n"
                "- React 관리 화면\n"
                "- 배치/알림 연동 경험 우대"
            ),
            url="https://www.jobkorea.co.kr/",
            posted_at=now - timedelta(days=3),
        ),
        NormalizedJob(
            source="sample",
            external_id="jobkorea-demo-2002",
            title="주니어 웹 개발자 (신입/전환)",
            company="스타트업랩",
            location="서울 영등포구",
            experience="신입 ~ 경력 1년",
            employment_type="정규직",
            skills="HTML, CSS, JavaScript, Node.js",
            summary="웹 기초가 탄탄한 주니어 개발자 채용. 멘토링과 페어 프로그래밍 제공.",
            description=(
                "서비스 화면/간단한 API를 함께 만들며 성장합니다.\n"
                "- HTML/CSS/JS 기본\n"
                "- Git 협업\n"
                "- 포트폴리오 또는 사이드 프로젝트 우대"
            ),
            url="https://www.jobkorea.co.kr/",
            posted_at=now - timedelta(hours=18),
        ),
        NormalizedJob(
            source="sample",
            external_id="saramin-demo-1003",
            title="DevOps / 인프라 엔지니어",
            company="클라우드브릿지",
            location="서울 서초구 · 재택 가능",
            experience="경력 3~8년",
            employment_type="정규직",
            skills="AWS, Kubernetes, CI/CD, Terraform",
            summary="AWS/K8s 기반 배포 파이프라인 구축·운영. 관측성(Observability) 경험 우대.",
            description=(
                "클라우드 인프라와 CI/CD를 책임집니다.\n"
                "- AWS / Kubernetes\n"
                "- GitHub Actions 또는 Jenkins\n"
                "- 모니터링·로그 파이프라인"
            ),
            url="https://www.saramin.co.kr/",
            posted_at=now - timedelta(days=4),
        ),
        NormalizedJob(
            source="sample",
            external_id="jobkorea-demo-2003",
            title="모바일 앱 개발자 (Flutter)",
            company="앱스퀘어",
            location="부산 해운대구",
            experience="경력 2~5년",
            employment_type="계약직 → 정규직 전환",
            skills="Flutter, Dart, Firebase, REST API",
            summary="Flutter 크로스플랫폼 앱 개발. 스토어 배포 경험자 우대.",
            description=(
                "Flutter로 iOS/Android 앱을 개발·배포합니다.\n"
                "- 상태관리 (Riverpod/Bloc 등)\n"
                "- REST / Firebase 연동\n"
                "- 앱스토어 배포 경험"
            ),
            url="https://www.jobkorea.co.kr/",
            posted_at=now - timedelta(days=5),
        ),
    ]

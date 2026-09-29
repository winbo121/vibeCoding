from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://postgres:vibeCoding123@localhost:5432/vibecoding"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:8080"
    jwt_secret: str = "vibecoding-dev-secret-change-me"
    jwt_expire_minutes: int = 60 * 12
    upload_dir: str = "uploads"

    # 사람인 Open API (https://oapi.saramin.co.kr/) — Application에서 발급받은 access-key
    saramin_api_key: str = ""
    saramin_api_url: str = "https://oapi.saramin.co.kr/job-search"
    # IT개발·데이터 상위 직무코드 예: 22 (사람인 코드표). 비우면 keywords만 사용
    saramin_job_mid_cd: str = ""

    # 잡코리아 파트너 API — 승인 후 발급되는 고유 호출링크(URL). 키 문자열이 아님.
    jobkorea_api_url: str = ""

    # 공통 검색/수집 설정
    jobs_keywords: str = "개발자"
    jobs_fetch_count: int = 50

    # 기술스택 정규화 AI (선택) — 없으면 내장 한글→영문 사전만 사용
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # 카카오 지도/장소 검색 (https://developers.kakao.com/)
    # REST: 키워드 검색 서버 프록시 / JS: 프론트 지도 표시(도메인 등록 필요)
    kakao_rest_api_key: str = ""
    kakao_js_key: str = ""


settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:vibeCoding123@localhost:5432/vibecoding"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:8080"
    jwt_secret: str = "vibecoding-dev-secret-change-me"
    jwt_expire_minutes: int = 60 * 12
    upload_dir: str = "uploads"


settings = Settings()

from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[2]


def resolve_app_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    if value.replace("\\", "/").startswith("backend/"):
        return PROJECT_ROOT / path
    return BACKEND_ROOT / path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Delivery Governance Backend"
    environment: str = "local"
    api_prefix: str = "/api/v1"
    secret_key: str = Field(default="change-this-in-production")
    access_token_expire_minutes: int = 480

    database_backend: str = "mysql"
    sqlite_database: str = "backend/storage/delivery_governance.db"
    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = "password"
    mysql_database: str = "delivery_governance"

    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    chroma_persist_directory: str = "backend/storage/chroma"
    chroma_collection: str = "delivery_governance_knowledge"

    openai_api_key: str | None = None
    openai_default_model: str = "gpt-4.1-mini"
    groq_api_key: str | None = None
    groq_default_model: str = "llama-3.3-70b-versatile"
    gemini_api_key: str | None = None
    gemini_default_model: str = "gemini-1.5-pro"
    anthropic_api_key: str | None = None
    claude_default_model: str = "claude-3-5-sonnet-latest"

    report_output_dir: str = "backend/storage/reports"
    report_templates_dir: str = "backend/storage/report_templates"

    @computed_field
    @property
    def database_url(self) -> str:
        if self.database_backend.lower() == "sqlite":
            path = resolve_app_path(self.sqlite_database)
            path.parent.mkdir(parents=True, exist_ok=True)
            return f"sqlite:///{path.as_posix()}"

        user = quote_plus(self.mysql_user)
        password = quote_plus(self.mysql_password)
        return (
            f"mysql+pymysql://{user}:{password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @property
    def report_dir(self) -> Path:
        path = resolve_app_path(self.report_output_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def templates_dir(self) -> Path:
        path = resolve_app_path(self.report_templates_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()

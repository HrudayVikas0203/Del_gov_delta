from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


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
        case_sensitive=False,
    )

    app_name: str = "Delivery Governance Backend"
    environment: str = "local"
    api_prefix: str = "/api/v1"
    secret_key: str = Field(default="change-this-in-production")
    access_token_expire_minutes: int = 480

    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
        description="SQLAlchemy connection URL used by the active environment.",
    )
    database_backend: str = "sqlite"
    sqlite_database: str = "backend/storage/delivery_governance.db"
    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = "password"
    mysql_database: str = "delivery_governance"
    mysql_ssl_ca: str | None = Field(
        default=None,
        validation_alias=AliasChoices("MYSQL_SSL_CA", "mysql_ssl_ca", "SSL_CA", "CA_CERT", "AIVEN_CA_CERT"),
    )
    mysql_ssl_cert: str | None = Field(
        default=None,
        validation_alias=AliasChoices("MYSQL_SSL_CERT", "mysql_ssl_cert", "SSL_CERT", "CLIENT_CERT"),
    )
    mysql_ssl_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("MYSQL_SSL_KEY", "mysql_ssl_key", "SSL_KEY", "CLIENT_KEY"),
    )

    backend_cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "https://del-gov-delta-k2zs.vercel.app,https://del-gov-delta.vercel.app"
    )
    cors_origin_regex: str | None = Field(
        default=r"https://.*\.vercel\.app",
        validation_alias=AliasChoices(
            "cors_origin_regex",
            "CORS_ORIGIN_REGEX",
            "CORS_ALLOW_ORIGIN_REGEX",
        ),
    )

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

    seed_demo_data: bool = True

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_user: str | None = None
    smtp_password: str | None = None
    from_email: str | None = None

    @staticmethod
    def normalize_database_url(raw_url: str | None) -> str | None:
        if not raw_url or not raw_url.strip():
            return raw_url

        candidate = raw_url.strip()
        try:
            parsed = make_url(candidate)
        except Exception:
            return candidate

        query: dict[str, str] = dict(parsed.query)
        for key in list(query):
            normalized_key = key.lower()
            if normalized_key in {
                "ssl",
                "ssl-mode",
                "ssl_mode",
                "ssl-ca",
                "ssl_ca",
                "ssl-cert",
                "ssl_cert",
                "ssl-key",
                "ssl_key",
            }:
                query.pop(key, None)

        driver = parsed.drivername.lower()
        if driver in {"mysql", "mysql+mysqldb"}:
            parsed = parsed.set(drivername="mysql+pymysql")
        if query:
            parsed = parsed.set(query=query)
        else:
            parsed = parsed.set(query={})
        return str(parsed)

    @model_validator(mode="after")
    def resolve_database_url(self) -> "Settings":
        if self.database_url and self.database_url.strip():
            self.database_url = self.normalize_database_url(self.database_url)
            return self

        if self.environment.lower() == "production":
            raise ValueError("DATABASE_URL environment variable is not configured.")

        if self.database_backend.lower() == "sqlite":
            path = resolve_app_path(self.sqlite_database)
            path.parent.mkdir(parents=True, exist_ok=True)
            self.database_url = f"sqlite:///{path.as_posix()}"
            return self

        user = quote_plus(self.mysql_user)
        password = quote_plus(self.mysql_password)
        self.database_url = self.normalize_database_url(
            f"mysql+pymysql://{user}:{password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )
        return self

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

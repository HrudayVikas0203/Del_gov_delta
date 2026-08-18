import hashlib
import logging
import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote, unquote

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[2]
LOGGER = logging.getLogger(__name__)


def log_database_debug(settings: "Settings") -> None:
    if os.getenv("DB_DEBUG", "").strip().lower() != "true":
        return

    env_url = (os.getenv("DATABASE_URL") or "").strip()
    display_url = (settings.database_url or "").strip()
    source = "DATABASE_URL" if env_url else "MYSQL_FIELDS"
    parsed = make_url(env_url) if env_url else None
    if parsed is None and display_url:
        parsed = make_url(display_url)

    password = parsed.password if parsed is not None and parsed.password is not None else None
    driver = parsed.drivername if parsed is not None and parsed.drivername else "mysql+pymysql"
    host = parsed.host if parsed is not None and parsed.host else settings.mysql_host
    port = parsed.port if parsed is not None and parsed.port is not None else settings.mysql_port
    database = parsed.database if parsed is not None and parsed.database else settings.mysql_database
    username = parsed.username if parsed is not None and parsed.username else settings.mysql_user

    print(f"DATABASE_CONFIG_SOURCE={source}")
    print(f"DATABASE_URL_PRESENT={bool(env_url or display_url)}")
    print(f"DATABASE_URL_LENGTH={len(env_url or display_url)}")
    print(f"DATABASE_DRIVER={driver}")
    print(f"DATABASE_HOST={host}")
    print(f"DATABASE_PORT={port}")
    print(f"DATABASE_NAME={database}")
    print(f"DATABASE_USERNAME={username}")
    print(f"DATABASE_PASSWORD_PRESENT={bool(password)}")
    print(f"DATABASE_PASSWORD_LENGTH={len(password) if password else 0}")
    print(f"DATABASE_PASSWORD_SHA256={hashlib.sha256(password.encode('utf-8')).hexdigest() if password else ''}")
    print(f"ENVIRONMENT={settings.environment}")


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
        populate_by_name=True,
    )

    def __init__(self, **values):
        super().__init__(**values)
        log_database_debug(self)

    app_name: str = "Delivery Governance Backend"
    environment: str = "local"
    api_prefix: str = "/api/v1"
    secret_key: str = Field(default="change-this-in-production")
    access_token_expire_minutes: int = 480

    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("database_url", "DATABASE_URL"),
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

        if "://" in candidate and "@" in candidate:
            scheme, remainder = candidate.split("://", 1)
            if "@" in remainder:
                userinfo, host_and_path = remainder.rsplit("@", 1)
                if ":" in userinfo:
                    username, password = userinfo.split(":", 1)
                    encoded_username = quote(unquote(username), safe="")
                    encoded_password = quote(unquote(password), safe="")
                    candidate = f"{scheme}://{encoded_username}:{encoded_password}@{host_and_path}"
                else:
                    encoded_username = quote(unquote(userinfo), safe="")
                    candidate = f"{scheme}://{encoded_username}@{host_and_path}"

        try:
            parsed = make_url(candidate)
        except Exception:
            return raw_url

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
        return parsed.render_as_string(hide_password=False)

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

        user = quote(self.mysql_user, safe="")
        password = quote(self.mysql_password, safe="")
        self.database_url = self.normalize_database_url(
            f"mysql+pymysql://{user}:{password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )
        return self

    def get_database_diagnostics(self) -> dict[str, object]:
        url = self.database_url or ""
        parsed = None
        if url:
            try:
                parsed = make_url(url)
            except Exception:
                parsed = None

        password = parsed.password if parsed is not None else ""
        password_present = bool(password)
        password_length = len(password) if password is not None else 0

        data: dict[str, object] = {
            "DATABASE_URL present": bool(url),
            "DATABASE_URL length": len(url),
            "Database driver": parsed.drivername if parsed is not None else "",
            "Database host": parsed.host if parsed is not None else "",
            "Database port": parsed.port if parsed is not None else "",
            "Database name": parsed.database if parsed is not None else "",
            "Database username": parsed.username if parsed is not None else "",
            "Password present": password_present,
            "Password length": password_length,
            "Environment": self.environment,
        }

        if password:
            data["Password fingerprint"] = hashlib.sha256(password.encode("utf-8")).hexdigest()

        return data

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


def log_database_diagnostics(settings: Settings) -> None:
    if os.getenv("DB_DEBUG", "").lower() != "true":
        return

    diagnostics = settings.get_database_diagnostics()
    LOGGER.warning(
        "Database diagnostics: DATABASE_URL present=%s DATABASE_URL length=%s Database driver=%s "
        "Database host=%s Database port=%s Database name=%s Database username=%s "
        "Password present=%s Password length=%s Environment=%s",
        diagnostics["DATABASE_URL present"],
        diagnostics["DATABASE_URL length"],
        diagnostics["Database driver"],
        diagnostics["Database host"],
        diagnostics["Database port"],
        diagnostics["Database name"],
        diagnostics["Database username"],
        diagnostics["Password present"],
        diagnostics["Password length"],
        diagnostics["Environment"],
    )

    if "Password fingerprint" in diagnostics:
        LOGGER.warning("Password fingerprint: %s", diagnostics["Password fingerprint"])


@lru_cache
def get_settings() -> Settings:
    return Settings()

import os
import ssl as ssl_module
import tempfile
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _read_mysql_ssl_value(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value and value.strip():
            return value.strip()
    return None


def build_mysql_connect_args() -> dict[str, object]:
    args: dict[str, object] = {}

    ca_value = (
        get_settings().mysql_ssl_ca
        or _read_mysql_ssl_value("MYSQL_SSL_CA", "SSL_CA", "CA_CERT", "AIVEN_CA_CERT")
    )
    cert_value = (
        get_settings().mysql_ssl_cert
        or _read_mysql_ssl_value("MYSQL_SSL_CERT", "SSL_CERT", "CLIENT_CERT")
    )
    key_value = (
        get_settings().mysql_ssl_key
        or _read_mysql_ssl_value("MYSQL_SSL_KEY", "SSL_KEY", "CLIENT_KEY")
    )

    ssl_config: dict[str, object] | None = None
    if ca_value:
        ca_content = ca_value.strip()
        if "-----BEGIN CERTIFICATE-----" in ca_content:
            cert_path = Path(tempfile.gettempdir()) / "aiven-ca.pem"
            cert_path.write_text(ca_content, encoding="utf-8")
            ssl_config = {"ca": str(cert_path), "check_hostname": True, "verify_mode": ssl_module.CERT_REQUIRED}
        else:
            ssl_config = {"ca": ca_content, "check_hostname": True, "verify_mode": ssl_module.CERT_REQUIRED}
    elif get_settings().environment.lower() == "production":
        default_ca = ssl_module.get_default_verify_paths().cafile
        if default_ca:
            ssl_config = {"ca": default_ca, "check_hostname": True, "verify_mode": ssl_module.CERT_REQUIRED}

    if ssl_config is not None:
        if cert_value:
            ssl_config["cert"] = cert_value
        if key_value:
            ssl_config["key"] = key_value
        args["ssl"] = ssl_config

    return args


settings = get_settings()
url = make_url(settings.database_url)
connect_args: dict[str, object] = {"check_same_thread": False} if url.get_backend_name() == "sqlite" else {}

if url.get_backend_name() == "mysql":
    connect_args.update(build_mysql_connect_args())

engine = create_engine(url, pool_pre_ping=True, pool_recycle=280, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

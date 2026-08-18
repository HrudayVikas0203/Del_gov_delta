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


settings = get_settings()
url = make_url(settings.database_url)
connect_args: dict[str, object] = {"check_same_thread": False} if url.get_backend_name() == "sqlite" else {}

if url.get_backend_name() == "mysql":
    ssl_config: dict[str, str] | None = None

    ca_value = (
        settings.mysql_ssl_ca
        or os.getenv("MYSQL_SSL_CA")
        or os.getenv("SSL_CA")
        or os.getenv("CA_CERT")
        or os.getenv("AIVEN_CA_CERT")
    )
    if ca_value:
        ca_content = ca_value.strip()
        if "-----BEGIN CERTIFICATE-----" in ca_content:
            cert_path = Path(tempfile.gettempdir()) / "aiven-ca.pem"
            cert_path.write_text(ca_content, encoding="utf-8")
            ssl_config = {"ca": str(cert_path)}
        else:
            ssl_config = {"ca": ca_content}
    elif settings.environment.lower() == "production":
        default_ca = ssl_module.get_default_verify_paths().cafile
        if default_ca:
            ssl_config = {"ca": default_ca}

    if ssl_config is not None:
        connect_args["ssl"] = ssl_config

engine = create_engine(str(url), pool_pre_ping=True, pool_recycle=280, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import hashlib
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

if os.getenv("DB_DEBUG", "").strip().lower() == "true":
    env_url = (os.getenv("DATABASE_URL") or "").strip()
    env_password = ""
    if env_url:
        try:
            env_url_parsed = make_url(env_url)
            env_password = env_url_parsed.password or ""
        except Exception:
            env_password = ""

    sql_password = url.password or ""
    env_fingerprint = hashlib.sha256(env_password.encode("utf-8")).hexdigest() if env_password else ""
    sql_fingerprint = hashlib.sha256(sql_password.encode("utf-8")).hexdigest() if sql_password else ""

    print(f"DATABASE_CONFIG_SOURCE={'DATABASE_URL' if env_url else 'MYSQL_FIELDS'}")
    print(f"DATABASE_DRIVER={url.drivername}")
    print(f"DATABASE_HOST={url.host}")
    print(f"DATABASE_PORT={url.port}")
    print(f"DATABASE_NAME={url.database}")
    print(f"DATABASE_USERNAME={url.username}")
    print(f"DATABASE_PASSWORD_PRESENT={bool(sql_password)}")
    print(f"DATABASE_PASSWORD_LENGTH={len(sql_password)}")
    print(f"DATABASE_PASSWORD_SHA256={sql_fingerprint}")
    print(f"SQLALCHEMY_URL_PASSWORD_PRESENT={bool(sql_password)}")
    print(f"SQLALCHEMY_URL_PASSWORD_LENGTH={len(sql_password)}")
    print(f"SQLALCHEMY_URL_PASSWORD_SHA256={sql_fingerprint}")
    print(f"DATABASE_URL_PASSWORD_SHA256={env_fingerprint}")
    print(f"DATABASE_URL_PASSWORD_MATCH={sql_fingerprint == env_fingerprint}")
    print(f"CONNECT_ARGS_KEYS={list(connect_args.keys())}")
    ssl_cfg = connect_args.get("ssl") if isinstance(connect_args.get("ssl"), dict) else None
    print(f"SSL_CONFIG_PRESENT={ssl_cfg is not None}")
    if ssl_cfg is not None:
        print(f"SSL_CA_PRESENT={bool(ssl_cfg.get('ca'))}")
        print(f"SSL_CHECK_HOSTNAME={bool(ssl_cfg.get('check_hostname'))}")
        print(f"SSL_VERIFY_MODE={ssl_cfg.get('verify_mode')}")

engine = create_engine(str(url), pool_pre_ping=True, pool_recycle=280, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from collections.abc import Generator

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
    ssl_config: dict[str, str | bool] = {}
    if settings.mysql_ssl_ca:
        ssl_config["ca"] = settings.mysql_ssl_ca
    if settings.mysql_ssl_cert:
        ssl_config["cert"] = settings.mysql_ssl_cert
    if settings.mysql_ssl_key:
        ssl_config["key"] = settings.mysql_ssl_key

    if "ssl" not in url.query:
        if ssl_config:
            connect_args["ssl"] = ssl_config
        elif settings.environment.lower() == "production":
            connect_args["ssl"] = True

engine = create_engine(str(url), pool_pre_ping=True, pool_recycle=280, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

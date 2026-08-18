import os
import ssl
from unittest.mock import patch

import pytest

from app.core.config import Settings
from app.db.session import build_mysql_connect_args


def _build_direct_pymysql_kwargs() -> dict[str, object]:
    return {
        "host": os.getenv("MYSQL_HOST", "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com"),
        "port": int(os.getenv("MYSQL_PORT", "13207")),
        "user": os.getenv("MYSQL_USER", "avnadmin"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "database": os.getenv("MYSQL_DATABASE", "defaultdb"),
        "ssl": build_mysql_connect_args().get("ssl"),
    }


def test_database_url_normalizes_mysql_driver_to_pymysql() -> None:
    with patch.dict(
        os.environ,
        {
            "DATABASE_URL": "mysql://avnadmin:secret-password@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4&ssl=true",
            "ENVIRONMENT": "production",
        },
        clear=False,
    ):
        settings = Settings()
        assert settings.database_url.startswith("mysql+pymysql://avnadmin:secret-password@")
        assert "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb" in settings.database_url
        assert settings.database_url.endswith("?charset=utf8mb4")
        assert "ssl=true" not in settings.database_url

    with patch.dict(
        os.environ,
        {
            "DATABASE_URL": "mysql+mysqldb://avnadmin:secret-password@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4&ssl=true",
            "ENVIRONMENT": "production",
        },
        clear=False,
    ):
        settings = Settings()
        assert settings.database_url.startswith("mysql+pymysql://avnadmin:secret-password@")
        assert "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb" in settings.database_url
        assert settings.database_url.endswith("?charset=utf8mb4")
        assert "ssl=true" not in settings.database_url


def test_database_url_prefers_render_database_url() -> None:
    with patch.dict(
        os.environ,
        {
            "DATABASE_URL": "mysql+pymysql://avnadmin:secret-password@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4",
            "ENVIRONMENT": "production",
        },
        clear=False,
    ):
        settings = Settings()
        assert settings.database_url.startswith("mysql+pymysql://avnadmin:secret-password@")
        assert "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb" in settings.database_url
        assert settings.database_url.endswith("?charset=utf8mb4")


def test_database_url_strips_ssl_mode_from_aiven_urls() -> None:
    with patch.dict(
        os.environ,
        {
            "DATABASE_URL": "mysql+pymysql://avnadmin:secret-password@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4&ssl-mode=REQUIRED",
            "ENVIRONMENT": "production",
        },
        clear=False,
    ):
        settings = Settings()
        assert settings.database_url.startswith("mysql+pymysql://avnadmin:secret-password@")
        assert "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb" in settings.database_url
        assert "ssl-mode" not in settings.database_url
        assert settings.database_url.endswith("?charset=utf8mb4")


def test_database_url_missing_in_production_is_clear_error() -> None:
    with patch.dict(os.environ, {"ENVIRONMENT": "production", "DATABASE_URL": ""}, clear=False):
        with pytest.raises(ValueError, match="DATABASE_URL environment variable is not configured"):
            Settings().database_url


def test_mysql_connect_args_require_secure_tls_verification(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DATABASE_URL", "mysql+pymysql://avnadmin:secret-password@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4")
    monkeypatch.setenv("MYSQL_SSL_CA", "/etc/ssl/certs/ca-certificates.crt")

    args = build_mysql_connect_args()
    assert "ssl" in args
    ssl_cfg = args["ssl"]
    assert isinstance(ssl_cfg, dict)
    assert ssl_cfg["ca"] == "/etc/ssl/certs/ca-certificates.crt"
    assert ssl_cfg["check_hostname"] is True
    assert ssl_cfg["verify_mode"] == ssl.CERT_REQUIRED


def test_direct_pymysql_uses_secure_ssl_configuration_from_env(monkeypatch) -> None:
    monkeypatch.setenv("MYSQL_HOST", "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com")
    monkeypatch.setenv("MYSQL_PORT", "13207")
    monkeypatch.setenv("MYSQL_USER", "avnadmin")
    monkeypatch.setenv("MYSQL_PASSWORD", "test-password")
    monkeypatch.setenv("MYSQL_DATABASE", "defaultdb")
    monkeypatch.setenv("MYSQL_SSL_CA", "/etc/ssl/certs/ca-certificates.crt")

    kwargs = _build_direct_pymysql_kwargs()
    assert kwargs["host"] == "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com"
    assert kwargs["port"] == 13207
    assert kwargs["user"] == "avnadmin"
    assert kwargs["database"] == "defaultdb"
    assert kwargs["ssl"] is not None
    assert kwargs["ssl"]["check_hostname"] is True
    assert kwargs["ssl"]["verify_mode"] == ssl.CERT_REQUIRED

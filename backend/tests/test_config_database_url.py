import os

from sqlalchemy.engine import make_url

from app.core.config import Settings, get_settings


def test_database_url_prefers_render_environment_variable(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_BACKEND", "mysql")
    monkeypatch.setenv("MYSQL_HOST", "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com")
    monkeypatch.setenv("MYSQL_PORT", "13207")
    monkeypatch.setenv("MYSQL_USER", "avnadmin")
    monkeypatch.setenv("MYSQL_PASSWORD", "TestPassword123")
    monkeypatch.setenv("MYSQL_DATABASE", "defaultdb")
    monkeypatch.setenv("ENVIRONMENT", "production")

    get_settings.cache_clear()
    settings = Settings()
    url = settings.database_url
    parsed = make_url(url)

    assert url.startswith("mysql+pymysql://")
    assert parsed.username == "avnadmin"
    assert parsed.host == "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com"
    assert parsed.port == 13207
    assert parsed.database == "defaultdb"
    assert parsed.drivername == "mysql+pymysql"
    assert parsed.password == "TestPassword123"

    diagnostics = settings.get_database_diagnostics()
    assert diagnostics["Database driver"] == "mysql+pymysql"
    assert diagnostics["Database username"] == "avnadmin"
    assert diagnostics["Password present"] is True
    assert diagnostics["Password length"] == len("TestPassword123")


def test_database_url_handles_sensitive_password_characters(monkeypatch):
    monkeypatch.setenv("DATABASE_BACKEND", "mysql")
    monkeypatch.setenv("MYSQL_HOST", "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com")
    monkeypatch.setenv("MYSQL_PORT", "13207")
    monkeypatch.setenv("MYSQL_USER", "avnadmin")
    monkeypatch.setenv("MYSQL_PASSWORD", "P@ss word!$%^&*()+={}[]:/?;.,~")
    monkeypatch.setenv("MYSQL_DATABASE", "defaultdb")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("DATABASE_URL", raising=False)

    settings = Settings()
    parsed = make_url(settings.database_url)

    assert parsed.password == "P@ss word!$%^&*()+={}[]:/?;.,~"
    assert parsed.username == "avnadmin"
    assert parsed.database == "defaultdb"


def test_database_url_explicit_render_override(monkeypatch):
    monkeypatch.setenv("DATABASE_BACKEND", "mysql")
    monkeypatch.setenv("MYSQL_HOST", "127.0.0.1")
    monkeypatch.setenv("MYSQL_PORT", "3306")
    monkeypatch.setenv("MYSQL_USER", "root")
    monkeypatch.setenv("MYSQL_PASSWORD", "local-secret")
    monkeypatch.setenv("MYSQL_DATABASE", "delivery_governance")
    monkeypatch.setenv(
        "DATABASE_URL",
        "mysql+pymysql://avnadmin:RenderPassword!2024@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4",
    )
    monkeypatch.setenv("ENVIRONMENT", "production")

    settings = Settings()
    parsed = make_url(settings.database_url)

    assert settings.database_url.startswith("mysql+pymysql://avnadmin:RenderPassword")
    assert parsed.username == "avnadmin"
    assert parsed.host == "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com"
    assert parsed.password == "RenderPassword!2024"

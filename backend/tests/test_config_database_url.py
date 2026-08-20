import os

from sqlalchemy.engine import make_url

from app.core.config import Settings, get_settings


def test_database_url_requires_render_database_url_in_production(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_BACKEND", "mysql")
    monkeypatch.setenv("MYSQL_HOST", "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com")
    monkeypatch.setenv("MYSQL_PORT", "13207")
    monkeypatch.setenv("MYSQL_USER", "avnadmin")
    monkeypatch.setenv("MYSQL_PASSWORD", "TestPassword123")
    monkeypatch.setenv("MYSQL_DATABASE", "defaultdb")
    monkeypatch.setenv("ENVIRONMENT", "production")

    get_settings.cache_clear()
    try:
        Settings()
        raise AssertionError("Expected production settings to require DATABASE_URL")
    except ValueError as exc:
        assert "DATABASE_URL environment variable is not configured" in str(exc)


def test_database_url_handles_sensitive_password_characters(monkeypatch):
    monkeypatch.setenv("DATABASE_BACKEND", "mysql")
    monkeypatch.setenv("MYSQL_HOST", "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com")
    monkeypatch.setenv("MYSQL_PORT", "13207")
    monkeypatch.setenv("MYSQL_USER", "avnadmin")
    monkeypatch.setenv("MYSQL_PASSWORD", "P@ss word!$%^&*()+={}[]:/?;.,~")
    monkeypatch.setenv("MYSQL_DATABASE", "defaultdb")
    monkeypatch.setenv("ENVIRONMENT", "local")
    monkeypatch.delenv("DATABASE_URL", raising=False)

    settings = Settings()
    parsed = make_url(settings.database_url)
    rendered = parsed.render_as_string(hide_password=False)

    assert "***" not in settings.database_url
    assert "***" not in rendered
    assert "P%40ss" in rendered
    assert "word" in rendered
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
    rendered = parsed.render_as_string(hide_password=False)

    assert settings.database_url is not None
    assert settings.database_url.startswith("mysql+pymysql://avnadmin:")
    assert "***" not in settings.database_url
    assert "***" not in rendered
    assert "RenderPassword" in rendered
    assert parsed.username == "avnadmin"
    assert parsed.host == "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com"
    assert parsed.database == "defaultdb"
    assert parsed.drivername == "mysql+pymysql"

    diagnostics = settings.get_database_diagnostics()
    assert diagnostics["Database driver"] == "mysql+pymysql"
    assert diagnostics["Database username"] == "avnadmin"
    assert diagnostics["Password present"] is True
    assert diagnostics["Password length"] == len("RenderPassword!2024")


def test_database_url_debug_does_not_log_credentials(monkeypatch, capsys):
    fake_password = "fake-password-123"
    monkeypatch.setenv("DB_DEBUG", "true")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv(
        "DATABASE_URL",
        f"mysql+pymysql://avnadmin:{fake_password}@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4",
    )
    monkeypatch.delenv("MYSQL_HOST", raising=False)
    monkeypatch.delenv("MYSQL_PORT", raising=False)
    monkeypatch.delenv("MYSQL_USER", raising=False)
    monkeypatch.delenv("MYSQL_PASSWORD", raising=False)
    monkeypatch.delenv("MYSQL_DATABASE", raising=False)

    settings = Settings()
    parsed = make_url(settings.database_url)
    assert parsed.password == fake_password

    output = capsys.readouterr().out
    assert output == ""
    assert fake_password not in output
    assert "DATABASE_URL=" not in output
    assert "mysql+pymysql://avnadmin:" not in output

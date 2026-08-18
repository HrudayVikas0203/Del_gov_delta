import os
from unittest.mock import patch

import pytest

from app.core.config import Settings


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
        assert settings.database_url.startswith("mysql+pymysql://avnadmin:***@")
        assert "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb" in settings.database_url
        assert "?charset=utf8mb4&ssl=true" in settings.database_url

    with patch.dict(
        os.environ,
        {
            "DATABASE_URL": "mysql+mysqldb://avnadmin:secret-password@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4&ssl=true",
            "ENVIRONMENT": "production",
        },
        clear=False,
    ):
        settings = Settings()
        assert settings.database_url.startswith("mysql+pymysql://avnadmin:***@")
        assert "mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb" in settings.database_url
        assert "?charset=utf8mb4&ssl=true" in settings.database_url


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
        assert settings.database_url == (
            "mysql+pymysql://avnadmin:secret-password@mysql-20d84f9-hrudayvikas2004-cd10.a.aivencloud.com:13207/defaultdb?charset=utf8mb4"
        )


def test_database_url_missing_in_production_is_clear_error() -> None:
    with patch.dict(os.environ, {"ENVIRONMENT": "production", "DATABASE_URL": ""}, clear=False):
        with pytest.raises(ValueError, match="DATABASE_URL environment variable is not configured"):
            Settings().database_url

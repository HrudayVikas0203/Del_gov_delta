from fastapi.testclient import TestClient

from app.main import app


VERCEL_ORIGIN = "https://del-gov-delta-gsdfuadmr-hrudayvikas2004-9161s-projects.vercel.app"


def test_login_preflight_returns_cors_response() -> None:
    with TestClient(app) as client:
        response = client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": VERCEL_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == VERCEL_ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]
    assert response.headers["access-control-allow-headers"] == "content-type"
    assert response.headers["access-control-allow-credentials"] == "true"
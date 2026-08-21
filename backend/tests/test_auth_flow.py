"""
Comprehensive authentication flow tests.
Tests the complete journey from login to API usage to logout.
"""

from fastapi.testclient import TestClient
from app.main import app


def test_login_creates_valid_jwt() -> None:
    """Test that login endpoint creates a valid JWT token."""
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "praveen.baburaya@delta.com", "password": "Demo@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 20  # JWT should be reasonably long


def test_login_with_invalid_credentials() -> None:
    """Test that login with wrong password returns 401."""
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "praveen.baburaya@delta.com", "password": "WrongPassword"},
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_login_with_nonexistent_user() -> None:
    """Test that login with nonexistent email returns 401."""
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "Demo@123"},
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_auth_me_with_valid_token() -> None:
    """Test that /auth/me returns user info with valid token."""
    client = TestClient(app)
    
    # First login
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "praveen.baburaya@delta.com", "password": "Demo@123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Then use token to get user info
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    user_data = me_response.json()
    assert user_data["email"] == "praveen.baburaya@delta.com"
    assert "id" in user_data
    assert "name" in user_data


def test_auth_me_without_token() -> None:
    """Test that /auth/me without token returns 401."""
    client = TestClient(app)
    response = client.get("/api/v1/auth/me")
    # OAuth2PasswordBearer raises 403 but our implementation might return 401
    assert response.status_code in (401, 403)
    assert "authenticated" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()


def test_auth_me_with_invalid_token() -> None:
    """Test that /auth/me with invalid token returns 401."""
    client = TestClient(app)
    headers = {"Authorization": "Bearer invalid.token.here"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]


def test_protected_endpoint_without_token() -> None:
    """Test that protected endpoints without token return 401 or 403."""
    client = TestClient(app)
    response = client.get("/api/v1/governance/employees")
    # Could be 401 or 403 depending on OAuth2PasswordBearer configuration
    assert response.status_code in (401, 403)
    error_msg = response.json()["detail"].lower()
    assert "authenticated" in error_msg or "invalid" in error_msg


def test_protected_endpoint_with_valid_token() -> None:
    """Test that protected endpoints with valid token work."""
    client = TestClient(app)
    
    # Login first
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "praveen.baburaya@delta.com", "password": "Demo@123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Access protected endpoint
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/governance/employees", headers=headers)
    assert response.status_code == 200
    employees = response.json()
    assert isinstance(employees, list)
    assert len(employees) > 0


def test_protected_endpoint_with_invalid_token() -> None:
    """Test that protected endpoints with invalid token return 401."""
    client = TestClient(app)
    headers = {"Authorization": "Bearer invalid.token.here"}
    response = client.get("/api/v1/governance/employees", headers=headers)
    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]


def test_authorization_header_formats() -> None:
    """Test various Authorization header formats."""
    client = TestClient(app)
    
    # Get a valid token first
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "praveen.baburaya@delta.com", "password": "Demo@123"},
    )
    token = login_response.json()["access_token"]
    
    # Test correct format
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/governance/employees", headers=headers)
    assert response.status_code == 200
    
    # Test malformed format (missing Bearer) - should fail
    headers = {"Authorization": token}
    response = client.get("/api/v1/governance/employees", headers=headers)
    # OAuth2PasswordBearer expects "Bearer " prefix, so this should fail
    assert response.status_code in (401, 403)
    
    # Test wrong scheme - should fail
    headers = {"Authorization": f"Basic {token}"}
    response = client.get("/api/v1/governance/employees", headers=headers)
    assert response.status_code in (401, 403)


def test_token_includes_required_claims() -> None:
    """Test that JWT token includes expected claims."""
    import jwt as pyjwt
    from app.core.config import get_settings
    
    client = TestClient(app)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "praveen.baburaya@delta.com", "password": "Demo@123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Decode token (without verification first, to check structure)
    decoded = pyjwt.decode(token, options={"verify_signature": False})
    assert "sub" in decoded  # Subject (user ID)
    assert "exp" in decoded  # Expiration
    assert "role" in decoded  # Role claim added by create_access_token
    
    # Verify the token can be properly decoded with the secret
    settings = get_settings()
    verified = pyjwt.decode(token, settings.secret_key, algorithms=["HS256"])
    assert "sub" in verified
    assert "exp" in verified


def test_account_creation_requires_authentication() -> None:
    """Test that POST /accounts requires authentication."""
    client = TestClient(app)
    
    # Try without token
    response = client.post(
        "/api/v1/governance/accounts",
        json={
            "name": "Test Account",
            "industry": "Finance",
            "country": "USA",
            "business_unit": "Banking",
        },
    )
    # Could be 401 or 403 depending on OAuth2PasswordBearer configuration
    assert response.status_code in (401, 403)
    error_msg = response.json()["detail"].lower()
    assert "authenticated" in error_msg or "invalid" in error_msg


def test_account_creation_requires_role() -> None:
    """Test that POST /accounts requires PROJECT_MANAGER role or higher."""
    client = TestClient(app)
    
    # Login as developer (insufficient role)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "sneha.patil@delta.com", "password": "Demo@123"},  # Developer role
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Try to create account
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/api/v1/governance/accounts",
        headers=headers,
        json={
            "name": "Test Account",
            "industry": "Finance",
            "country": "USA",
            "business_unit": "Banking",
        },
    )
    assert response.status_code == 403
    assert "Insufficient" in response.json()["detail"]


def test_account_creation_with_proper_role() -> None:
    """Test that POST /accounts works with PROJECT_MANAGER role."""
    import uuid
    
    client = TestClient(app)
    
    # Login as project manager (has permission)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "shanmukha.rewal@delta.com", "password": "Demo@123"},  # Project Manager
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Create account
    headers = {"Authorization": f"Bearer {token}"}
    account_name = f"Test Account {uuid.uuid4().hex[:8]}"
    response = client.post(
        "/api/v1/governance/accounts",
        headers=headers,
        json={
            "name": account_name,
            "industry": "Finance",
            "country": "USA",
            "business_unit": "Banking",
            "contract_value": 1000000,
        },
    )
    assert response.status_code == 201
    account_data = response.json()
    assert account_data["name"] == account_name
    assert "id" in account_data

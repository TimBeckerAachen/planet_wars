
from fastapi.testclient import TestClient

def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_read_root(client):
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

class TestSignup:
    def test_successful_signup(self, client):
        response = client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "securepassword123"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "testuser"
        assert data["user"]["email"] == "test@example.com"
        assert "id" in data["user"]

    def test_signup_duplicate_username(self, client):
        # Create first user
        client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test1@example.com",
                "password": "password123"
            }
        )
        
        # Try duplicate username
        response = client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test2@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 400
        assert "Username already registered" in response.json()["detail"]

    def test_signup_duplicate_email(self, client):
        client.post(
            "/auth/signup",
            json={
                "username": "testuser1",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        
        response = client.post(
            "/auth/signup",
            json={
                "username": "testuser2",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

class TestLogin:
    def test_login_with_username(self, client):
        # Setup user
        client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "securepassword123"
            }
        )
        
        response = client.post(
            "/auth/login",
            json={
                "identifier": "testuser",
                "password": "securepassword123"
            }
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_login_with_email(self, client):
        client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "securepassword123"
            }
        )
        
        response = client.post(
            "/auth/login",
            json={
                "identifier": "test@example.com",
                "password": "securepassword123"
            }
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_login_wrong_password(self, client):
        client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "securepassword123"
            }
        )
        
        response = client.post(
            "/auth/login",
            json={
                "identifier": "testuser",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/auth/login",
            json={
                "identifier": "nonexistent",
                "password": "password"
            }
        )
        assert response.status_code == 401

class TestAuthMe:
    def test_get_current_user_with_valid_token(self, client):
        # Signup and login (or just use token from signup)
        resp = client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password"
            }
        )
        token = resp.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        assert response.json()["username"] == "testuser"

    def test_get_current_user_no_token(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client):
        headers = {"Authorization": "Bearer invalidtoken"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401

class TestEndToEndFlow:
    def test_signup_login_protected_route(self, client):
        """Test complete flow: signup -> login -> access protected route"""
        # Step 1: Signup
        signup_response = client.post(
            "/auth/signup",
            json={
                "username": "alice",
                "email": "alice@example.com",
                "password": "alicepassword"
            }
        )
        assert signup_response.status_code == 201
        
        # Step 2: Login
        login_response = client.post(
            "/auth/login",
            json={
                "identifier": "alice",
                "password": "alicepassword"
            }
        )
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]
        
        # Step 3: Access protected route
        headers = {"Authorization": f"Bearer {access_token}"}
        me_response = client.get("/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["username"] == "alice"

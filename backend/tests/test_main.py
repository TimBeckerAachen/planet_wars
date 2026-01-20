from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import Base, get_db
import models
import pytest

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables before each test and drop after"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_read_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


# Authentication Tests

class TestSignup:
    """Test user signup endpoint"""
    
    def test_successful_signup(self):
        """Test successful user registration"""
        response = client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        
        # Check response structure
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        
        # Check user data
        user = data["user"]
        assert user["username"] == "testuser"
        assert user["email"] == "test@example.com"
        assert "id" in user
        assert "hashed_password" not in user  # Password should not be in response
    
    def test_signup_duplicate_username(self):
        """Test signup with duplicate username"""
        # Create first user
        client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test1@example.com",
                "password": "password123"
            }
        )
        
        # Try to create second user with same username
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
    
    def test_signup_duplicate_email(self):
        """Test signup with duplicate email"""
        # Create first user
        client.post(
            "/auth/signup",
            json={
                "username": "testuser1",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        
        # Try to create second user with same email
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
    
    def test_signup_invalid_email(self):
        """Test signup with invalid email format"""
        response = client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "invalid-email",
                "password": "password123"
            }
        )
        
        assert response.status_code == 422
    
    def test_signup_short_password(self):
        """Test signup with password too short"""
        response = client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "short"
            }
        )
        
        assert response.status_code == 422


class TestLogin:
    """Test user login endpoint"""
    
    def test_login_with_username(self):
        """Test successful login with username"""
        # Create user
        client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        
        # Login with username
        response = client.post(
            "/auth/login",
            json={
                "identifier": "testuser",
                "password": "password123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "testuser"
    
    def test_login_with_email(self):
        """Test successful login with email"""
        # Create user
        client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        
        # Login with email
        response = client.post(
            "/auth/login",
            json={
                "identifier": "test@example.com",
                "password": "password123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == "test@example.com"
    
    def test_login_wrong_password(self):
        """Test login with incorrect password"""
        # Create user
        client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        
        # Try to login with wrong password
        response = client.post(
            "/auth/login",
            json={
                "identifier": "testuser",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        response = client.post(
            "/auth/login",
            json={
                "identifier": "nonexistent",
                "password": "password123"
            }
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]


class TestAuthMe:
    """Test /auth/me protected endpoint"""
    
    def test_get_current_user_with_valid_token(self):
        """Test getting current user with valid JWT token"""
        # Create and login user
        signup_response = client.post(
            "/auth/signup",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        
        token = signup_response.json()["access_token"]
        
        # Get current user
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        user = response.json()
        assert user["username"] == "testuser"
        assert user["email"] == "test@example.com"
    
    def test_get_current_user_without_token(self):
        """Test /auth/me without token"""
        response = client.get("/auth/me")
        
        assert response.status_code == 401  # Unauthorized without token
    
    def test_get_current_user_with_invalid_token(self):
        """Test /auth/me with invalid token"""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code == 401


class TestEndToEndFlow:
    """Test complete authentication flow"""
    
    def test_signup_login_protected_route(self):
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
        signup_token = signup_response.json()["access_token"]
        
        # Step 2: Access protected route with signup token
        me_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {signup_token}"}
        )
        
        assert me_response.status_code == 200
        assert me_response.json()["username"] == "alice"
        
        # Step 3: Login again
        login_response = client.post(
            "/auth/login",
            json={
                "identifier": "alice",
                "password": "alicepassword"
            }
        )
        
        assert login_response.status_code == 200
        login_token = login_response.json()["access_token"]
        
        # Step 4: Access protected route with login token
        me_response_2 = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {login_token}"}
        )
        
        assert me_response_2.status_code == 200
        assert me_response_2.json()["email"] == "alice@example.com"

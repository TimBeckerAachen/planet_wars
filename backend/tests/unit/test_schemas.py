"""Unit tests for Pydantic schemas"""
import pytest
from pydantic import ValidationError
from schemas import UserSignupRequest, UserLoginRequest


class TestUserSignupRequest:
    """Test UserSignupRequest schema validation"""
    
    def test_valid_signup_data(self):
        """Test valid user signup data"""
        data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123"
        }
        user = UserSignupRequest(**data)
        
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.password == "password123"
    
    def test_invalid_email_format(self):
        """Test that invalid email format is rejected"""
        data = {
            "username": "testuser",
            "email": "invalid-email",
            "password": "password123"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserSignupRequest(**data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"] == ("email",) for error in errors)
    
    def test_password_too_short(self):
        """Test that password shorter than 8 characters is rejected"""
        data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "short"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserSignupRequest(**data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"] == ("password",) for error in errors)
    
    def test_username_too_short(self):
        """Test that username shorter than 3 characters is rejected"""
        data = {
            "username": "ab",
            "email": "test@example.com",
            "password": "password123"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserSignupRequest(**data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"] == ("username",) for error in errors)
    
    def test_username_alphanumeric_validation(self):
        """Test that username must be alphanumeric"""
        # Valid usernames
        valid_usernames = ["user123", "test_user", "test-user", "USER"]
        for username in valid_usernames:
            data = {
                "username": username,
                "email": "test@example.com",
                "password": "password123"
            }
            user = UserSignupRequest(**data)
            assert user.username == username
        
        # Invalid username with special characters
        data = {
            "username": "user@name",
            "email": "test@example.com",
            "password": "password123"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserSignupRequest(**data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"] == ("username",) for error in errors)
    
    def test_required_fields(self):
        """Test that all required fields must be provided"""
        # Missing password
        with pytest.raises(ValidationError):
            UserSignupRequest(username="testuser", email="test@example.com")
        
        # Missing email
        with pytest.raises(ValidationError):
            UserSignupRequest(username="testuser", password="password123")
        
        # Missing username
        with pytest.raises(ValidationError):
            UserSignupRequest(email="test@example.com", password="password123")


class TestUserLoginRequest:
    """Test UserLoginRequest schema validation"""
    
    def test_valid_login_data(self):
        """Test valid login data"""
        data = {
            "identifier": "testuser",
            "password": "password123"
        }
        login = UserLoginRequest(**data)
        
        assert login.identifier == "testuser"
        assert login.password == "password123"
    
    def test_required_fields(self):
        """Test that all required fields must be provided"""
        # Missing password
        with pytest.raises(ValidationError):
            UserLoginRequest(identifier="testuser")
        
        # Missing identifier
        with pytest.raises(ValidationError):
            UserLoginRequest(password="password123")

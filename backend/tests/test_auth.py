"""Unit tests for authentication utilities"""
import pytest
from datetime import timedelta
from jose import jwt, JWTError
import auth
from config import settings


class TestPasswordHashing:
    """Test password hashing and verification"""
    
    def test_hash_password_creates_valid_hash(self):
        """Test that hash_password creates a valid bcrypt hash"""
        password = "testpassword123"
        hashed = auth.hash_password(password)
        
        # Argon2 hashes start with $argon2
        assert hashed.startswith("$argon2")
    
    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "testpassword123"
        hashed = auth.hash_password(password)
        
        assert auth.verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = auth.hash_password(password)
        
        assert auth.verify_password(wrong_password, hashed) is False
    
    def test_hash_uniqueness(self):
        """Test that same password produces different hashes (due to salt)"""
        password = "testpassword123"
        hash1 = auth.hash_password(password)
        hash2 = auth.hash_password(password)
        
        # Hashes should be different due to random salt
        assert hash1 != hash2
        # But both should verify correctly
        assert auth.verify_password(password, hash1) is True
        assert auth.verify_password(password, hash2) is True


class TestJWTTokens:
    """Test JWT token creation and verification"""
    
    def test_create_access_token(self):
        """Test JWT token creation with valid data"""
        data = {"user_id": 1, "username": "testuser"}
        token = auth.create_access_token(data)
        
        # Should be a non-empty string
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Should be decodable
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        assert payload["user_id"] == 1
        assert payload["username"] == "testuser"
        assert "exp" in payload  # Expiration should be set
    
    def test_create_token_with_custom_expiration(self):
        """Test token creation with custom expiration time"""
        data = {"user_id": 1, "username": "testuser"}
        expires_delta = timedelta(minutes=15)
        token = auth.create_access_token(data, expires_delta=expires_delta)
        
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        assert "exp" in payload
    
    def test_verify_token_valid(self):
        """Test token verification with valid token"""
        data = {"user_id": 1, "username": "testuser"}
        token = auth.create_access_token(data)
        
        payload = auth.verify_token(token)
        assert payload["user_id"] == 1
        assert payload["username"] == "testuser"
    
    def test_verify_token_invalid(self):
        """Test token verification with invalid token"""
        from fastapi import HTTPException
        
        invalid_token = "invalid.token.string"
        
        with pytest.raises(HTTPException) as exc_info:
            auth.verify_token(invalid_token)
        
        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail
    
    def test_verify_token_wrong_secret(self):
        """Test token verification with token signed with wrong secret"""
        from fastapi import HTTPException
        
        # Create token with different secret
        data = {"user_id": 1, "username": "testuser"}
        wrong_token = jwt.encode(data, "wrong-secret", algorithm=settings.jwt_algorithm)
        
        with pytest.raises(HTTPException) as exc_info:
            auth.verify_token(wrong_token)
        
        assert exc_info.value.status_code == 401
    
    def test_token_payload_contains_correct_info(self):
        """Test that token payload contains all required information"""
        data = {"user_id": 42, "username": "alice"}
        token = auth.create_access_token(data)
        
        payload = auth.verify_token(token)
        assert payload["user_id"] == 42
        assert payload["username"] == "alice"
        assert "exp" in payload

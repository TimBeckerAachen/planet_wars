from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional


class UserSignupRequest(BaseModel):
    """Schema for user registration request"""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 characters)")
    
    @validator('username')
    def username_alphanumeric(cls, v):
        """Ensure username is alphanumeric with underscores/hyphens allowed"""
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (underscores and hyphens allowed)')
        return v


class UserLoginRequest(BaseModel):
    """Schema for user login request"""
    identifier: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    """Schema for user data response (excludes password)"""
    id: int
    username: str
    email: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Schema for authentication response with JWT token"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Schema for decoded JWT token payload"""
    user_id: int
    username: str


class AuthErrorResponse(BaseModel):
    """Schema for authentication error responses"""
    detail: str

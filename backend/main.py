from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from . import models, schemas, auth
from .database import engine, get_db
from .config import settings

app = FastAPI(title="Planet Wars API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify local/staging/prod URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Create database tables on startup"""
    models.Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/")
def read_root():
    return {"message": "Hello from Planet Wars API!"}


# Authentication Endpoints

@app.post("/auth/signup", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: schemas.UserSignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user
    
    - **username**: Unique username (3-50 characters, alphanumeric)
    - **email**: Valid email address
    - **password**: Password (minimum 8 characters)
    
    Returns JWT access token and user data
    """
    # Check if username already exists
    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = auth.hash_password(user_data.password)
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate JWT token
    access_token = auth.create_access_token(
        data={"user_id": new_user.id, "username": new_user.username}
    )
    
    return schemas.AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.from_orm(new_user)
    )


@app.post("/auth/login", response_model=schemas.AuthResponse)
def login(credentials: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user and return JWT token
    
    - **identifier**: Username or email
    - **password**: User password
    
    Returns JWT access token and user data
    """
    # Try to find user by username or email
    user = db.query(models.User).filter(
        (models.User.username == credentials.identifier) | 
        (models.User.email == credentials.identifier)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Generate JWT token
    access_token = auth.create_access_token(
        data={"user_id": user.id, "username": user.username}
    )
    
    return schemas.AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.from_orm(user)
    )


@app.get("/auth/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """
    Get current authenticated user information
    
    Requires valid JWT token in Authorization header
    """
    return schemas.UserResponse.from_orm(current_user)

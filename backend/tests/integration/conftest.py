import os

# Disable rate limiting for tests globally before importing app
os.environ["LIMITER_ENABLED"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base, get_db
from main import app

# Use a single in-memory database for validation
# Using StaticPool is critical for :memory: databases to be shared across threads
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# Apply the override GLOBALLY for the test session
# This avoids race conditions where individual tests set/unset it
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def db_session():
    """
    Creates a fresh database for every test case.
    Using 'function' scope ensures isolation.
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    Returns a TestClient.
    The db_session fixture automatically handles the DB setup/teardown.
    """
    client = TestClient(app)
    client.headers["X-Client-Source"] = "planet-wars-frontend"
    return client

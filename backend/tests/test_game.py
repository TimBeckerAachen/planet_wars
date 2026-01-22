from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from main import app
import models
import pytest
import os

# Use in-memory SQLite for comprehensive isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool # Important for in-memory to persist across threads if needed
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Initialize client with app
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Save existing overrides to restore later if needed (good citizenship)
    original_override = app.dependency_overrides.get(get_db)
    
    # Set our override
    app.dependency_overrides[get_db] = override_get_db
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    yield
    
    # Teardown
    Base.metadata.drop_all(bind=engine)
    
    # Restore original override or clear if none existed
    if original_override:
        app.dependency_overrides[get_db] = original_override
    elif get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]



def test_signup_creates_planet():
    response = client.post(
        "/auth/signup",
        json={"username": "player1", "email": "p1@test.com", "password": "password123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    assert "access_token" in data
    
    # Check if login works
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check Game State
    response = client.get("/game/state", headers=headers)
    assert response.status_code == 200
    state = response.json()
    assert state["user"]["gold"] == 100
    assert state["planet"]["owner_id"] == state["user"]["id"]
    assert len(state["buildings"]) >= 1
    assert state["buildings"][0]["name"] == "gold_mine"
    
def test_build_construction():
    # Helper to get auth token
    response = client.post(
        "/auth/signup",
        json={"username": "builder", "email": "build@test.com", "password": "password123"}
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Build Factory
    response = client.post("/game/build?building_name=space_ship_factory", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Construction started"
    
    # Verify gold deduction and building presence
    # Factory Cost is 100 (Base), User had 100. Left: 0.
    response = client.get("/game/state", headers=headers)
    state = response.json()
    assert state["user"]["gold"] == 0 
    factory = next((b for b in state["buildings"] if b["name"] == "space_ship_factory"), None)
    assert factory is not None
    assert factory["is_constructing"] == True

def test_insufficient_gold_dynamic():
    # User has 100 Gold initially. University costs 150.
    response = client.post(
        "/auth/signup",
        json={"username": "broke_student", "email": "broke@test.com", "password": "password123"}
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post("/game/build?building_name=university", headers=headers)
    assert response.status_code == 400
    assert "Not enough gold" in response.json()["detail"]

def test_map_view():
    # Create another user
    client.post(
        "/auth/signup",
        json={"username": "mapper", "email": "map@test.com", "password": "password123"}
    ).json()
    
    # Get token for first user (already created in setup effectively or reused)
    # Actually setup is module scoped, so previous users exist.
    # Just login as player1
    response = client.post(
        "/auth/login",
        json={"identifier": "player1", "password": "password123"}
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/game/map", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["planets"]) >= 2 # player1, builder, mapper

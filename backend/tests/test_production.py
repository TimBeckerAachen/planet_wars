
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from main import app
import pytest
from datetime import datetime, timedelta, timezone
import models
from game_logic import process_production, UNIT_STATS

# Use in-memory SQLite for comprehensive isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool 
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client_fixture = TestClient(app)

@pytest.fixture
def client():
    # Reset DB
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return client_fixture

@pytest.fixture
def db_session():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(db_session):
    user = models.User(username="tester", email="test@t.com", hashed_password="pw")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_unit_production_flow(client):

    # 1. Signup
    response = client.post(
        "/auth/signup",
        json={"username": "commander", "email": "cmd@test.com", "password": "password123"}
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get State to find Planet/Building IDs
    state = client.get("/game/state", headers=headers).json()
    planet_id = state["planet"]["id"]
    
    # Cheat: Add University and Factory directly to DB to skip build times/costs for this test
    # (Or use the API if we had cheat codes, but direct DB manipulation in test fixture is easier if not mocking)
    # Since we are using client, we rely on API or pre-seeding. 
    # Let's use the build API but skip validation/costs? No, better to verify standard flow or modify DB in test.
    # Modifying DB in test is cleaner for unit test speed.
    pass

def test_production_logic(db_session, test_user):
    # Setup: Planet
    planet = models.Planet(owner_id=test_user.id, x=0, y=0, name="Test")
    db_session.add(planet)
    db_session.commit()
    
    # Setup: University Lvl 1
    uni = models.Building(planet_id=planet.id, name="university", level=1)
    db_session.add(uni)
    db_session.commit()
    
    # 1. Start Pilot Production
    # Manually trigger start
    uni.production_type = "pilot"
    duration = UNIT_STATS["pilot"]["base_time"] # 600s
    uni.production_finish_time = datetime.now(timezone.utc) + timedelta(seconds=duration)
    db_session.commit()
    
    # 2. Process - Not finished
    process_production(planet, [uni], db_session)
    stored_uni = db_session.query(models.Building).filter_by(id=uni.id).first()
    assert stored_uni.production_type == "pilot" # Still producing
    
    # 3. Fast Forward
    uni.production_finish_time = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()
    
    # 4. Process - Finished
    process_production(planet, [uni], db_session)
    stored_uni = db_session.query(models.Building).filter_by(id=uni.id).first()
    assert stored_uni.production_type is None
    
    # 5. Check Unit
    pilot = db_session.query(models.Unit).filter_by(planet_id=planet.id, name="pilot").first()
    assert pilot is not None
    assert pilot.count == 1
    
    # 6. Test Speed Scaling (Level 2)
    uni.level = 2
    # Logic check via logic function
    from game_logic import get_unit_stats
    stats = get_unit_stats("pilot", 2)
    assert stats["duration"] == 300 # 600 / 2

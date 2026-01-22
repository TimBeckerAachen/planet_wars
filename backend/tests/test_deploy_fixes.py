from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from main import app
import models
import auth
import auto_migrate
import pytest

# In-memory DB
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

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    original = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if original:
        app.dependency_overrides[get_db] = original
    elif get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]

def test_auto_migrate_idempotency():
    """Test that auto-migrate runs without error on existing schema."""
    # Since we use sqlite, the generic text(...) we used should validly run or skip
    # Our script uses engine.dialect check for type.
    # We just want to ensure it doesn't crash.
    # Monkeypatch the engine in auto_migrate to use our test engine
    original_engine = auto_migrate.engine
    auto_migrate.engine = engine
    try:
        auto_migrate.run_auto_migrations()
        assert True
    except Exception as e:
        pytest.fail(f"Auto migration crashed: {e}")
    finally:
        auto_migrate.engine = original_engine

def test_lazy_planet_creation():
    """Test that a user without a planet gets one assigned when accessing /game/state."""
    db = TestingSessionLocal()
    
    # Manually create a user WITHOUT a planet (simulation of legacy user)
    legacy_user = models.User(
        username="legacy",
        email="legacy@test.com",
        hashed_password=auth.hash_password("password123"),
        gold=100
    )
    db.add(legacy_user)
    db.commit()
    db.refresh(legacy_user)
    user_id = legacy_user.id
    db.close()
    
    # Generate token
    token = auth.create_access_token(data={"user_id": user_id, "username": "legacy"})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Access game state
    response = client.get("/game/state", headers=headers)
    
    # Should NOT be 404, should be 200 with new planet
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["username"] == "legacy"
    assert data["planet"]["owner_id"] == user_id
    assert data["planet"]["name"] is not None
    # Should also have a gold mine created
    assert len(data["buildings"]) > 0
    assert data["buildings"][0]["name"] == "gold_mine"

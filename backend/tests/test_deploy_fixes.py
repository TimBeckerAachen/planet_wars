
from sqlalchemy import text
from database import Base
from main import app
import models
import auth
import auto_migrate
import pytest
from conftest import engine, TestingSessionLocal

# No local engine creation needed, import shared engine/sessionLocal if needed for simulation
# But better to just use db_session fixture

def test_auto_migrate_idempotency(db_session):
    """Test that auto-migrate runs without error on existing schema."""
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

def test_lazy_planet_creation(client, db_session):
    """Test that a user without a planet gets one assigned when accessing /game/state."""
    # Manually create a user WITHOUT a planet (simulation of legacy user)
    legacy_user = models.User(
        username="legacy",
        email="legacy@test.com",
        hashed_password=auth.hash_password("password123"),
        gold=100
    )
    db_session.add(legacy_user)
    db_session.commit()
    db_session.refresh(legacy_user)
    user_id = legacy_user.id
    
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

def test_timezone_conflict(db_session):
    """
    Verify that calculate_resources handles offset-aware datetimes from DB
    without crashing when subtracting mixed naive/aware types.
    """
    from datetime import datetime, timezone, timedelta
    
    # Create user with valid timezone-aware last_resource_update
    # Simulating what Postgres returns (offset-aware)
    aware_time = datetime.now(timezone.utc) - timedelta(hours=1)
    
    user = models.User(
        username="tz_test",
        email="tz@test.com",
        hashed_password="hash",
        gold=100,
        last_resource_update=aware_time
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Create buildings
    b = models.Building(planet_id=1, name="gold_mine", level=1) # dummy planet_id
    
    # Call calculate_resources
    import game_logic
    try:
        game_logic.calculate_resources(user, [b], db_session)
        assert True
    except TypeError as e:
        pytest.fail(f"Timezone conflict error: {e}")

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import auth
import models
from database import get_db
from main import app


def test_change_password(client, db_session: Session):
    # Setup user
    username = "pass_user"
    password = "old_password"
    hashed = auth.hash_password(password)
    user = models.User(username=username, email="pass@test.com", hashed_password=hashed)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = auth.create_access_token(
        data={"user_id": user.id, "username": user.username}
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Test Wrong Old Password
    response = client.put(
        "/auth/password",
        json={"old_password": "wrong", "new_password": "new_password_123"},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid old password"

    # Test Success
    response = client.put(
        "/auth/password",
        json={"old_password": password, "new_password": "new_password_123"},
        headers=headers,
    )
    assert response.status_code == 200

    # Verify login with new password
    db_session.refresh(user)
    assert auth.verify_password("new_password_123", user.hashed_password)


def test_delete_user(client, db_session: Session):
    # Setup user with planet
    username = "del_user"
    user = models.User(username=username, email="del@test.com", hashed_password="pw")
    db_session.add(user)
    db_session.commit()

    planet = models.Planet(owner_id=user.id, x=0, y=0, name="DelPlanet")
    db_session.add(planet)
    db_session.commit()

    token = auth.create_access_token(
        data={"user_id": user.id, "username": user.username}
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Delete User
    response = client.delete("/auth/me", headers=headers)
    assert response.status_code == 204

    # Verify User Gone
    deleted_user = db_session.query(models.User).filter_by(username=username).first()
    assert deleted_user is None

    # Verify Planet exists but orphaned
    orphaned_planet = (
        db_session.query(models.Planet).filter_by(name="DelPlanet").first()
    )
    assert orphaned_planet is not None
    assert orphaned_planet.owner_id is None

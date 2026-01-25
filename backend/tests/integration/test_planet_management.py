import pytest


def test_rename_planet_success(client):
    # 1. Signup
    response = client.post(
        "/auth/signup",
        json={
            "username": "renamer",
            "email": "rename@test.com",
            "password": "password123",
        },
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Initial State
    state = client.get("/game/state", headers=headers).json()
    planet_id = state["planet"]["id"]
    old_name = state["planet"]["name"]

    # 3. Rename
    new_name = "New-Earth-2026"
    response = client.patch(
        "/game/planet/rename", json={"name": new_name}, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == new_name
    assert data["owner_username"] == "renamer"

    # 4. Verify in State
    state = client.get("/game/state", headers=headers).json()
    assert state["planet"]["name"] == new_name


def test_rename_planet_duplicate(client):
    # User 1
    resp1 = client.post(
        "/auth/signup",
        json={"username": "user1", "email": "u1@test.com", "password": "password123"},
    )
    token1 = resp1.json()["access_token"]

    # User 2
    resp2 = client.post(
        "/auth/signup",
        json={"username": "user2", "email": "u2@test.com", "password": "password123"},
    )
    token2 = resp2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # User 1 renames
    client.patch(
        "/game/planet/rename",
        json={"name": "AlphaPrime"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    # User 2 tries to use same name
    response = client.patch(
        "/game/planet/rename", json={"name": "AlphaPrime"}, headers=headers2
    )
    assert response.status_code == 409
    assert "taken" in response.json()["detail"]


def test_map_shows_usernames(client):
    client.post(
        "/auth/signup",
        json={
            "username": "mapper_king",
            "email": "king@test.com",
            "password": "password123",
        },
    )

    # No auth needed for map? API says Depends(auth) so yes.
    # We can use the same token
    response = client.post(
        "/auth/login", json={"identifier": "mapper_king", "password": "password123"}
    )
    token = response.json()["access_token"]

    response = client.get("/game/map", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    planets = response.json()["planets"]

    my_planet = next(p for p in planets if p["owner_username"] == "mapper_king")
    assert my_planet is not None
    assert my_planet["name"].startswith("Planet")  # default dynamic name


import pytest
# No localized engine imports needed, fixtures provided by conftest.py

def test_signup_creates_planet(client):
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
    
def test_build_construction(client):
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

def test_insufficient_gold_dynamic(client):
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

def test_map_view(client):
    # Create another user
    client.post(
        "/auth/signup",
        json={"username": "mapper", "email": "map@test.com", "password": "password123"}
    ).json()
    
    # Get token for first user (if test order matters, we should create our own user here)
    # Since fixtures reset DB per function (scope="function"), "player1" DOES NOT EXIST from previous tests.
    # We must create a user for this test.
    
    response = client.post(
        "/auth/signup",
        json={"username": "player1", "email": "player1@test.com", "password": "password123"}
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/game/map", headers=headers)
    assert response.status_code == 200
    data = response.json()
    # Should see at least 2 planets: mapper and player1
    assert len(data["planets"]) >= 2
    

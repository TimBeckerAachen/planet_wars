"""Tests for message functionality."""


def test_get_messages_empty(client):
    """Test getting messages when there are none."""
    response = client.post(
        "/auth/signup",
        json={
            "username": "messenger",
            "email": "msg@test.com",
            "password": "password123",
        },
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/game/messages", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["messages"] == []
    assert data["unread_count"] == 0


def test_mark_nonexistent_message_read(client):
    """Test marking a non-existent message as read."""
    response = client.post(
        "/auth/signup",
        json={
            "username": "reader",
            "email": "read@test.com",
            "password": "password123",
        },
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.patch("/game/messages/999/read", headers=headers)
    assert response.status_code == 404
    assert "Message not found" in response.json()["detail"]


def test_messages_require_auth(client):
    """Test that messages endpoint requires authentication."""
    response = client.get("/game/messages")
    assert response.status_code == 401

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


def test_send_message_to_player(client):
    """Test sending a message to another player."""
    # Create sender
    response1 = client.post(
        "/auth/signup",
        json={
            "username": "sender",
            "email": "sender@test.com",
            "password": "password123",
        },
    )
    sender_token = response1.json()["access_token"]
    sender_headers = {"Authorization": f"Bearer {sender_token}"}

    # Create recipient
    response2 = client.post(
        "/auth/signup",
        json={
            "username": "recipient",
            "email": "recipient@test.com",
            "password": "password123",
        },
    )
    recipient_token = response2.json()["access_token"]
    recipient_headers = {"Authorization": f"Bearer {recipient_token}"}

    # Send message
    response = client.post(
        "/game/messages/send",
        json={
            "recipient_username": "recipient",
            "subject": "Hello!",
            "body": "This is a test message.",
        },
        headers=sender_headers,
    )
    assert response.status_code == 200
    assert response.json()["subject"] == "Hello!"

    # Check recipient's mailbox
    response = client.get("/game/messages", headers=recipient_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 1
    assert data["messages"][0]["subject"] == "Hello!"
    assert data["unread_count"] == 1

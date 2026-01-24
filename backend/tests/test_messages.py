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


def test_delete_message(client):
    """Test deleting a message."""
    # Create user
    response = client.post(
        "/auth/signup",
        json={
            "username": "deleter",
            "email": "delete@test.com",
            "password": "password123",
        },
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Retrieve own ID
    game_state = client.get("/game/state", headers=headers).json()
    user_id = game_state["user"]["id"]

    # Manually create a message (since send_message prevents self-sending)
    # We'll use a second user to send a message
    response2 = client.post(
        "/auth/signup",
        json={
            "username": "sender2",
            "email": "sender2@test.com",
            "password": "password123",
        },
    )
    sender_token = response2.json()["access_token"]
    sender_headers = {"Authorization": f"Bearer {sender_token}"}

    client.post(
        "/game/messages/send",
        json={
            "recipient_username": "deleter",
            "subject": "Delete me",
            "body": "Trash content",
        },
        headers=sender_headers,
    )

    # Verify message exists
    response = client.get("/game/messages", headers=headers)
    data = response.json()
    assert len(data["messages"]) == 1
    msg_id = data["messages"][0]["id"]

    # Delete message
    response = client.delete(f"/game/messages/{msg_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Message deleted"

    # Verify gone
    response = client.get("/game/messages", headers=headers)
    data = response.json()
    assert len(data["messages"]) == 0

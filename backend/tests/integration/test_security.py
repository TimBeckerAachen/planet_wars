import pytest
from fastapi.testclient import TestClient


def test_missing_client_source_header(client):
    # Try to access a protected route without header
    # Remove the global header for this test
    if "X-Client-Source" in client.headers:
        del client.headers["X-Client-Source"]

    # /auth/signup is protected now
    response = client.post(
        "/auth/signup",
        json={"username": "test_sec", "password": "password123", "email": "sec@e.com"},
    )
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_valid_client_source_header(client):
    headers = {"X-Client-Source": "planet-wars-frontend"}
    response = client.post(
        "/auth/signup",
        json={
            "username": "test_sec_ok",
            "password": "password123",
            "email": "sec_ok@e.com",
        },
        headers=headers,
    )
    # Should be 201 Created
    if response.status_code != 201:
        print(f"Error: {response.status_code}, {response.json()}")
    assert response.status_code == 201


def test_rate_limiting(client):
    from main import app
    from security import limiter

    # Re-enable for this test
    limiter.enabled = True
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = True

    print(f"DEBUG: Limiter Enabled: {limiter.enabled}")

    try:
        headers = {"X-Client-Source": "planet-wars-frontend"}
        # Limit is 5/minute for signup

        hit_limit = False
        for i in range(10):
            response = client.post(
                "/auth/signup",
                json={
                    "username": f"test_rl_{i}",
                    "password": "password123",
                    "email": f"rl_{i}@e.com",
                },
                headers=headers,
            )
            print(f"Req {i}: Status {response.status_code}")
            if response.status_code == 429:
                hit_limit = True
                break

        assert hit_limit, "Should have hit rate limit"
    finally:
        # Restore default state (Disabled)
        limiter.enabled = False
        if hasattr(app.state, "limiter"):
            app.state.limiter.enabled = False

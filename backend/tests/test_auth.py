def test_signup_creates_user_and_sets_session_cookie(client):
    response = client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})

    assert response.status_code == 200
    assert response.json() == {"id": 1, "email": "a@example.com"}
    assert "session_token" in response.cookies


def test_signup_rejects_duplicate_email(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    response = client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})

    assert response.status_code == 409


def test_signup_rejects_short_password(client):
    response = client.post("/api/auth/signup", json={"email": "a@example.com", "password": "short"})

    assert response.status_code == 422


def test_login_succeeds_with_correct_password(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    client.post("/api/auth/logout")
    response = client.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"})

    assert response.status_code == 200


def test_login_rejects_wrong_password(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    response = client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrongpass"})

    assert response.status_code == 401


def test_login_rejects_unknown_email(client):
    response = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "password123"})

    assert response.status_code == 401


def test_me_requires_authentication(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_returns_current_user_after_signup(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "a@example.com"


def test_logout_clears_session(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    client.post("/api/auth/logout")
    response = client.get("/api/auth/me")

    assert response.status_code == 401

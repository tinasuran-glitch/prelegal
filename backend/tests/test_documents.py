from app.documents import create_document


def test_list_documents_requires_authentication(client):
    response = client.get("/api/documents")

    assert response.status_code == 401


def test_list_documents_empty_for_new_user(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    response = client.get("/api/documents")

    assert response.status_code == 200
    assert response.json() == []


def test_get_document_returns_404_for_unknown_id(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    response = client.get("/api/documents/999")

    assert response.status_code == 404


def test_get_document_returns_404_for_another_users_document(client):
    client.post("/api/auth/signup", json={"email": "owner@example.com", "password": "password123"})
    document_id = create_document(1, "pilot-agreement", {"Customer": "Acme"}, False)

    client.post("/api/auth/logout")
    client.post("/api/auth/signup", json={"email": "other@example.com", "password": "password123"})
    response = client.get(f"/api/documents/{document_id}")

    assert response.status_code == 404


def test_chat_turn_is_visible_via_documents_endpoints(client, monkeypatch):
    def fake_generic(doc_type, messages):
        return "Here is your summary.", {label: "x" for label in doc_type.field_labels}

    monkeypatch.setattr("app.chat.call_generic_llm", fake_generic)

    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    chat_response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "documentType": "pilot-agreement"},
    )
    document_id = chat_response.json()["documentId"]

    list_response = client.get("/api/documents")
    detail_response = client.get(f"/api/documents/{document_id}")

    assert chat_response.status_code == 200
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["id"] == document_id
    assert detail_response.status_code == 200
    assert detail_response.json()["fields"]["Customer"] == "x"


def test_chat_rejects_document_id_owned_by_another_user(client, monkeypatch):
    def fake_generic(doc_type, messages):
        return "Here is your summary.", {label: "x" for label in doc_type.field_labels}

    monkeypatch.setattr("app.chat.call_generic_llm", fake_generic)

    client.post("/api/auth/signup", json={"email": "owner@example.com", "password": "password123"})
    owner_response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "documentType": "pilot-agreement"},
    )
    owned_document_id = owner_response.json()["documentId"]

    client.post("/api/auth/logout")
    client.post("/api/auth/signup", json={"email": "other@example.com", "password": "password123"})
    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "hi"}],
            "documentType": "pilot-agreement",
            "documentId": owned_document_id,
        },
    )

    assert response.status_code == 404

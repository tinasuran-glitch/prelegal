import sqlite3

from app import db


def test_init_db_creates_users_table(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")

    db.init_db()

    assert db.DB_PATH.exists()
    with sqlite3.connect(db.DB_PATH) as conn:
        columns = [row[1] for row in conn.execute("PRAGMA table_info(users)")]
    assert columns == ["id", "email", "password_hash", "created_at"]


def test_init_db_creates_sessions_and_documents_tables(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")

    db.init_db()

    with sqlite3.connect(db.DB_PATH) as conn:
        session_columns = [row[1] for row in conn.execute("PRAGMA table_info(sessions)")]
        document_columns = [row[1] for row in conn.execute("PRAGMA table_info(documents)")]

    assert session_columns == ["token", "user_id", "created_at"]
    assert document_columns == [
        "id",
        "user_id",
        "document_type",
        "fields",
        "is_complete",
        "created_at",
        "updated_at",
    ]


def test_get_connection_commits_and_closes(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    db.init_db()

    with db.get_connection() as conn:
        conn.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", ("a@example.com", "hash"))

    with sqlite3.connect(db.DB_PATH) as conn:
        row = conn.execute("SELECT email FROM users WHERE email = ?", ("a@example.com",)).fetchone()
    assert row is not None


def test_init_db_resets_existing_data(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")

    db.init_db()
    with sqlite3.connect(db.DB_PATH) as conn:
        conn.execute("INSERT INTO users (email, password_hash) VALUES ('a@example.com', 'hash')")
        conn.commit()

    db.init_db()

    with sqlite3.connect(db.DB_PATH) as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    assert count == 0

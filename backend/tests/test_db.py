import sqlite3

from app import db


def test_init_db_creates_users_table(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")

    db.init_db()

    assert db.DB_PATH.exists()
    with sqlite3.connect(db.DB_PATH) as conn:
        columns = [row[1] for row in conn.execute("PRAGMA table_info(users)")]
    assert columns == ["id", "email", "created_at"]


def test_init_db_resets_existing_data(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")

    db.init_db()
    with sqlite3.connect(db.DB_PATH) as conn:
        conn.execute("INSERT INTO users (email) VALUES ('a@example.com')")
        conn.commit()

    db.init_db()

    with sqlite3.connect(db.DB_PATH) as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    assert count == 0

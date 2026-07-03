import os
import sqlite3
from pathlib import Path

DB_PATH = Path(
    os.environ.get("DB_PATH", Path(__file__).resolve().parent.parent / "data" / "prelegal.db")
)


def init_db() -> None:
    """Create a fresh SQLite database with the users table, discarding any prior data."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    DB_PATH.unlink(missing_ok=True)

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )

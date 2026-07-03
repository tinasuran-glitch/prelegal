import json
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth import AuthenticatedUser, get_current_user
from app.db import get_connection
from app.schemas import CamelModel


def create_document(user_id: int, document_type: str, fields: dict[str, str | None], is_complete: bool) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO documents (user_id, document_type, fields, is_complete) VALUES (?, ?, ?, ?)",
            (user_id, document_type, json.dumps(fields), is_complete),
        )
        return cursor.lastrowid


def update_document(document_id: int, fields: dict[str, str | None], is_complete: bool) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE documents SET fields = ?, is_complete = ?, updated_at = datetime('now') WHERE id = ?",
            (json.dumps(fields), is_complete, document_id),
        )


def list_documents_for_user(user_id: int) -> list[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()


def get_document_for_user(document_id: int, user_id: int) -> sqlite3.Row | None:
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (document_id, user_id),
        ).fetchone()


class DocumentSummary(CamelModel):
    id: int
    document_type: str
    is_complete: bool
    created_at: str
    updated_at: str


class DocumentDetail(DocumentSummary):
    fields: dict[str, str | None]


def _to_summary(row: sqlite3.Row) -> DocumentSummary:
    return DocumentSummary(
        id=row["id"],
        document_type=row["document_type"],
        is_complete=bool(row["is_complete"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _to_detail(row: sqlite3.Row) -> DocumentDetail:
    return DocumentDetail(**_to_summary(row).model_dump(), fields=json.loads(row["fields"]))


router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("")
def list_documents(user: AuthenticatedUser = Depends(get_current_user)) -> list[DocumentSummary]:
    return [_to_summary(row) for row in list_documents_for_user(user.id)]


@router.get("/{document_id}")
def get_document(document_id: int, user: AuthenticatedUser = Depends(get_current_user)) -> DocumentDetail:
    row = get_document_for_user(document_id, user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _to_detail(row)

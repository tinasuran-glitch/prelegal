import hashlib
import hmac
import secrets
from dataclasses import dataclass

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import Field

from app.db import get_connection
from app.schemas import CamelModel

SESSION_COOKIE = "session_token"
PBKDF2_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    salt, _, expected_hex = password_hash.partition("$")
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return hmac.compare_digest(digest.hex(), expected_hex)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    email: str


def email_taken(email: str) -> bool:
    with get_connection() as conn:
        row = conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone()
    return row is not None


def create_user(email: str, password: str) -> AuthenticatedUser:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (email, hash_password(password)),
        )
        return AuthenticatedUser(id=cursor.lastrowid, email=email)


def authenticate_user(email: str, password: str) -> AuthenticatedUser | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None or not verify_password(password, row["password_hash"]):
        return None
    return AuthenticatedUser(id=row["id"], email=row["email"])


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with get_connection() as conn:
        conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    return token


def delete_session(token: str) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def user_for_session(token: str) -> AuthenticatedUser | None:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.email FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()
    return AuthenticatedUser(id=row["id"], email=row["email"]) if row else None


def get_current_user(session_token: str | None = Cookie(default=None)) -> AuthenticatedUser:
    user = user_for_session(session_token) if session_token else None
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return user


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax", path="/")


class SignupRequest(CamelModel):
    email: str
    password: str = Field(min_length=8)


class LoginRequest(CamelModel):
    email: str
    password: str


class UserOut(CamelModel):
    id: int
    email: str


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
def signup(request: SignupRequest, response: Response) -> UserOut:
    if email_taken(request.email):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = create_user(request.email, request.password)
    _set_session_cookie(response, create_session(user.id))
    return UserOut(id=user.id, email=user.email)


@router.post("/login")
def login(request: LoginRequest, response: Response) -> UserOut:
    user = authenticate_user(request.email, request.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    _set_session_cookie(response, create_session(user.id))
    return UserOut(id=user.id, email=user.email)


@router.post("/logout")
def logout(response: Response, session_token: str | None = Cookie(default=None)) -> dict[str, str]:
    if session_token:
        delete_session(session_token)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "ok"}


@router.get("/me")
def me(user: AuthenticatedUser = Depends(get_current_user)) -> UserOut:
    return UserOut(id=user.id, email=user.email)

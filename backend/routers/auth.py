"""Authentication router for user registration and login."""

import logging
import secrets
import hashlib
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import get_connection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Store active sessions in memory for demo (in production, use a DB-backed session table)
active_sessions: dict[str, str] = {}  # token -> user_id

# --- Request/Response Models ---

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    clinic_name: str = ""
    role: str = "patient"

class LoginRequest(BaseModel):
    email: str
    password: str


def _hash_password(password: str) -> str:
    """Hash password with salt for storage. Not production-grade but sufficient for demo."""
    salt = "assentiq_demo_2026"
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return hashed


@router.post("/register")
async def register(req: RegisterRequest):
    """Register a new user account."""
    conn = get_connection()
    try:
        # Check if email already exists
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        # Create user
        user_id = secrets.token_urlsafe(24)
        password_hash = _hash_password(req.password)
        now = datetime.now().isoformat()

        conn.execute(
            """INSERT INTO users 
               (id, email, password_hash, full_name, clinic_name, role, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, req.email, password_hash, req.full_name, req.clinic_name, req.role, now),
        )
        conn.commit()

        # Log in immediately — create session token
        session_token = secrets.token_urlsafe(48)
        active_sessions[session_token] = user_id

        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        user_dict = dict(user_row) if user_row else {}

        return {
            "user": {k: user_dict[k] for k in ["id", "email", "full_name", "clinic_name", "role", "created_at", "last_login"]},
            "session_token": session_token,
        }
    finally:
        conn.close()


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate user and create session."""
    conn = get_connection()
    try:
        user_row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (req.email,)
        ).fetchone()

        if not user_row:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_dict = dict(user_row)
        if user_dict["password_hash"] != _hash_password(req.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login timestamp
        now = datetime.now().isoformat()
        conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user_dict["id"]))
        conn.commit()

        # Create session token
        session_token = secrets.token_urlsafe(48)
        active_sessions[session_token] = user_dict["id"]

        return {
            "user": {k: user_dict[k] for k in ["id", "email", "full_name", "clinic_name", "role", "created_at", "last_login"]},
            "session_token": session_token,
        }
    finally:
        conn.close()


@router.post("/logout")
async def logout(request: Request):
    """End current session."""
    token = request.headers.get("x-session-token")
    if token and token in active_sessions:
        del active_sessions[token]
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(request: Request):
    """Get current user profile."""
    token = request.headers.get("x-session-token")
    if not token or token not in active_sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = active_sessions[token]
    conn = get_connection()
    try:
        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")

        return {k: user_row[k] for k in ["id", "email", "full_name", "clinic_name", "role", "created_at", "last_login"]}
    finally:
        conn.close()
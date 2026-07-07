"""JWT utility for admin authentication."""

import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

# Load from environment
JWT_SECRET = os.getenv("JWT_SECRET", "assentiq-jwt-secret-2026")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
JWT_ALGORITHM = "HS256"

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")


def create_admin_token() -> str:
    """Create a JWT token for admin."""
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    payload = {
        "sub": "admin",
        "iat": now,
        "exp": expiration,
        "nbf": now,
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_admin_token(token: str) -> bool:
    """Verify a JWT token and return True if valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Check expiration
        exp = payload.get("exp")
        if not exp:
            return False
        if datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            return False
        # Check subject is admin
        if payload.get("sub") != "admin":
            return False
        return True
    except JWTError:
        return False


def verify_admin_credentials(username: str, password: str) -> bool:
    """Verify admin username and password from environment."""
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD
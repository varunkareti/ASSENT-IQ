"""Admin router — admin authentication with JWT, dashboard KPIs, session management, and PDF downloads."""

import os
import logging
import time
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from dotenv import load_dotenv

from database import get_connection
from routers.jwt_auth import (
    create_admin_token,
    verify_admin_token,
    verify_admin_credentials,
)

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])

# ─── Rate Limiting ──────────────────────────────────────────────────────────────
_login_attempts: dict[str, list[float]] = {}  # ip -> [timestamps]
MAX_ATTEMPTS = 5
ATTEMPT_WINDOW_SECONDS = 60


def _check_rate_limit(ip: str) -> bool:
    """Check if IP has exceeded login attempts. Returns True if allowed."""
    now = time.time()
    if ip not in _login_attempts:
        _login_attempts[ip] = []

    # Remove old attempts outside the window
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < ATTEMPT_WINDOW_SECONDS]

    if len(_login_attempts[ip]) >= MAX_ATTEMPTS:
        return False  # Blocked

    return True  # Allowed


def _record_login_attempt(ip: str):
    """Record a login attempt timestamp."""
    if ip not in _login_attempts:
        _login_attempts[ip] = []
    _login_attempts[ip].append(time.time())


def _get_client_ip(request: Request) -> str:
    """Get client IP address."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ─── Models ─────────────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    message: str


# ─── Admin Login ────────────────────────────────────────────────────────────────

@router.post("/login")
async def admin_login(req: AdminLoginRequest, request: Request):
    """Authenticate admin with JWT token. Rate limited to 5 attempts per minute."""
    client_ip = _get_client_ip(request)

    # Check rate limit
    if not _check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again in 60 seconds."
        )

    # Verify credentials
    if not verify_admin_credentials(req.username, req.password):
        _record_login_attempt(client_ip)
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    # Clear failed attempts on success
    if client_ip in _login_attempts:
        _login_attempts[client_ip] = []

    # Generate JWT token
    token = create_admin_token()

    return AdminLoginResponse(access_token=token, message="Admin login successful")


# ─── Admin Stats / KPIs ─────────────────────────────────────────────────────────

@router.get("/stats")
async def get_admin_stats(request: Request):
    """Get dashboard KPIs: total sessions, procedure breakdown."""
    if not verify_admin_token(request.headers.get("authorization", "").replace("Bearer ", "")):
        raise HTTPException(status_code=401, detail="Not authenticated as admin")

    conn = get_connection()
    try:
        # Total sessions
        total = conn.execute("SELECT COUNT(*) as cnt FROM sessions").fetchone()["cnt"]

        # Root Canal count
        root_canal = conn.execute(
            "SELECT COUNT(*) as cnt FROM sessions WHERE procedure_id = 'root_canal'"
        ).fetchone()["cnt"]

        # Extraction count
        extraction = conn.execute(
            "SELECT COUNT(*) as cnt FROM sessions WHERE procedure_id = 'extraction'"
        ).fetchone()["cnt"]

        # Dental Implant count
        dental_implant = conn.execute(
            "SELECT COUNT(*) as cnt FROM sessions WHERE procedure_id = 'dental_implant'"
        ).fetchone()["cnt"]

        return {
            "total_sessions": total,
            "root_canal": root_canal,
            "extraction": extraction,
            "dental_implant": dental_implant,
        }
    finally:
        conn.close()


# ─── List All Sessions ──────────────────────────────────────────────────────────

@router.get("/sessions")
async def get_all_sessions(request: Request):
    """Get all sessions with basic info for admin dashboard table."""
    if not verify_admin_token(request.headers.get("authorization", "").replace("Bearer ", "")):
        raise HTTPException(status_code=401, detail="Not authenticated as admin")

    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT
                   s.id, s.patient_name, s.procedure_id, s.tooth, s.status, s.created_at,
                   c.pdf_path, c.signed_at,
                   s.clinic_name, s.doctor_name,
                   s.clinic_address, s.clinic_phone, s.clinic_email, s.clinic_website
               FROM sessions s
               LEFT JOIN consents c ON s.id = c.session_id
               ORDER BY s.created_at DESC"""
        ).fetchall()

        sessions = []
        for r in rows:
            sessions.append({
                "id": r["id"],
                "patient_name": r["patient_name"],
                "procedure_id": r["procedure_id"],
                "tooth": r["tooth"],
                "status": r["status"],
                "created_at": r["created_at"],
                "signed_at": r["signed_at"],
                "has_pdf": r["pdf_path"] is not None,
                "clinic_name": r["clinic_name"],
                "doctor_name": r["doctor_name"],
                "clinic_address": r["clinic_address"],
                "clinic_phone": r["clinic_phone"],
                "clinic_email": r["clinic_email"],
                "clinic_website": r["clinic_website"],
            })

        return sessions
    finally:
        conn.close()


# ─── Get Session Detail ─────────────────────────────────────────────────────────

@router.get("/session/{session_id}")
async def get_session_detail(request: Request, session_id: str):
    """Get full details of a specific session including Q&A log."""
    if not verify_admin_token(request.headers.get("authorization", "").replace("Bearer ", "")):
        raise HTTPException(status_code=401, detail="Not authenticated as admin")

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM sessions WHERE id = ?",
            (session_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Session not found")

        session = dict(row)

        # Fetch Q&A log
        qa_rows = conn.execute(
            "SELECT question, answer, timestamp FROM qa_log WHERE session_id = ? ORDER BY timestamp ASC",
            (session_id,),
        ).fetchall()
        session["qa_log"] = [dict(r) for r in qa_rows]

        # Fetch consent info if exists
        consent_row = conn.execute(
            "SELECT * FROM consents WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        session["consent"] = dict(consent_row) if consent_row else None

        return session
    finally:
        conn.close()


# ─── Download PDF ───────────────────────────────────────────────────────────────

@router.get("/download/{session_id}")
async def download_admin_pdf(request: Request, session_id: str):
    """Download consent PDF for any session (admin only)."""
    if not verify_admin_token(request.headers.get("authorization", "").replace("Bearer ", "")):
        raise HTTPException(status_code=401, detail="Not authenticated as admin")

    from fastapi.responses import FileResponse as FastAPIFileResponse

    PDF_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "pdfs")

    conn = get_connection()
    try:
        pdf_path = None

        # Try to get pdf_path from consents table
        row = conn.execute(
            "SELECT pdf_path FROM consents WHERE session_id = ?",
            (session_id,),
        ).fetchone()

        if row and row["pdf_path"]:
            pdf_path = row["pdf_path"]

        # If no consents row, search for PDF on disk by session_id pattern
        # PDFs are saved as {session_id}.pdf (not consent_{session_id}.pdf)
        if not pdf_path and os.path.exists(PDF_DIR):
            exact = os.path.join(PDF_DIR, f"{session_id}.pdf")
            if os.path.exists(exact):
                pdf_path = exact
            else:
                # Fallback: scan for any file starting with session_id
                for f in os.listdir(PDF_DIR):
                    if f.startswith(f"{session_id}"):
                        pdf_path = os.path.join(PDF_DIR, f)
                        break

        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF not found")

        return FastAPIFileResponse(pdf_path, media_type="application/pdf", filename=f"consent_{session_id}.pdf")
    finally:
        conn.close()


# ─── Delete Session/Consent ─────────────────────────────────────────────────────

@router.delete("/session/{session_id}")
async def delete_session(request: Request, session_id: str):
    """Delete a session and all associated data (consent, PDF, QA log, signature). Admin only."""
    if not verify_admin_token(request.headers.get("authorization", "").replace("Bearer ", "")):
        raise HTTPException(status_code=401, detail="Not authenticated as admin")

    # First check if session exists
    conn = get_connection()
    try:
        session_row = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not session_row:
            raise HTTPException(status_code=404, detail="Session not found")

        SIG_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "signatures")
        PDF_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "pdfs")

        pdf_path_to_delete = None

        # Try to get pdf_path from consents table
        consent_row = conn.execute(
            "SELECT pdf_path FROM consents WHERE session_id = ?",
            (session_id,),
        ).fetchone()

        if consent_row and consent_row["pdf_path"]:
            pdf_path_to_delete = consent_row["pdf_path"]

        # If no consents row (common with current schema), check if a PDF exists on disk by session_id
        # PDFs are saved as {session_id}.pdf (not consent_{session_id}.pdf)
        if not pdf_path_to_delete and os.path.exists(PDF_DIR):
            exact = os.path.join(PDF_DIR, f"{session_id}.pdf")
            if os.path.exists(exact):
                pdf_path_to_delete = exact
            else:
                # Fallback: scan for any file starting with session_id
                for f in os.listdir(PDF_DIR) if os.path.exists(PDF_DIR) else []:
                    if f.startswith(f"{session_id}"):
                        pdf_path_to_delete = os.path.join(PDF_DIR, f)
                        break

        # Delete PDF file if found
        if pdf_path_to_delete and os.path.exists(pdf_path_to_delete):
            os.remove(pdf_path_to_delete)
            logger.info(f"Deleted PDF: {pdf_path_to_delete}")

        # Delete signature file if exists
        sig_path = os.path.join(SIG_DIR, f"{session_id}.png")
        if os.path.exists(sig_path):
            os.remove(sig_path)
            logger.info(f"Deleted signature: {sig_path}")

        # Delete from consents (if row exists)
        conn.execute("DELETE FROM consents WHERE session_id = ?", (session_id,))

        # Delete from qa_log
        conn.execute("DELETE FROM qa_log WHERE session_id = ?", (session_id,))

        # Delete session
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

        conn.commit()

        return {"message": f"Session {session_id} and all associated data deleted successfully"}
    finally:
        conn.close()


# ─── Logout ─────────────────────────────────────────────────────────────────────

@router.post("/logout")
async def admin_logout(request: Request):
    """End admin session (JWT tokens are stateless, so client just discards token)."""
    return {"message": "Admin session ended"}

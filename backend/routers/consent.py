"""Consent router — signature capture and consent submission with PDF generation."""

import os
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse as FastAPIFileResponse

from schemas import (
    ConsentSubmitRequest, ConsentSubmitResponse, ConsentRecord,
    CreateSessionRequest,
)
from gemini_service import load_procedure_content, summarize_qa
from pdf_service import generate_consent_pdf
from database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/consent", tags=["consent"])

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage")
SIG_DIR = os.path.join(STORAGE_DIR, "signatures")
PDF_DIR = os.path.join(STORAGE_DIR, "pdfs")
os.makedirs(SIG_DIR, exist_ok=True)
os.makedirs(PDF_DIR, exist_ok=True)


# ─── Session helpers ─────────────────────────────────────────────────────────

def _get_active_token(request: Request) -> str | None:
    return request.headers.get("x-session-token")


def _get_user_id_from_token(token: str | None) -> str | None:
    """Look up user_id from session token (shared with auth)."""
    if not token:
        return None
    try:
        from routers.auth import active_sessions
    except ImportError:
        from auth import active_sessions
    return active_sessions.get(token)


# ─── Create Session ──────────────────────────────────────────────────────────

@router.post("/sessions")
async def create_session(req: CreateSessionRequest, request: Request):
    """Create a new consent session with optional clinic/practice info."""
    # Try to link authenticated user
    token = request.headers.get("x-session-token")
    user_id = None
    if token:
        try:
            from routers.auth import active_sessions
        except ImportError:
            from auth import active_sessions
        user_id = active_sessions.get(token)

    conn = get_connection()
    try:
        session_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        conn.execute(
            """INSERT INTO sessions
               (id, user_id, patient_name, procedure_id, tooth, clinic_name, doctor_name,
                clinic_address, clinic_phone, clinic_email, clinic_website,
                created_at, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress')""",
            (
                session_id, user_id,
                req.patient_name, req.procedure_id, req.tooth,
                req.clinic_name or "", req.doctor_name or "",
                req.clinic_address or "", req.clinic_phone or "",
                req.clinic_email or "", req.clinic_website or "",
                now,
            ),
        )
        conn.commit()

        return {
            "session_id": session_id,
            "patient_name": req.patient_name,
            "procedure_id": req.procedure_id,
        }
    finally:
        conn.close()


# ─── Signature ───────────────────────────────────────────────────────────────

@router.post("/signature")
async def upload_signature(
    request: Request,
    session_id: str = Form(...),
    signature: UploadFile = File(...),
):
    """Save patient signature image."""
    token = _get_active_token(request)
    user_id = _get_user_id_from_token(token)

    # Validate session exists
    conn = get_connection()
    try:
        row = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")

        # Link session to user if authenticated
        if user_id:
            conn.execute("UPDATE sessions SET user_id = ? WHERE id = ?", (user_id, session_id))
            conn.commit()
    finally:
        conn.close()

    # Save signature
    sig_filename = f"{session_id}.png"
    sig_path = os.path.join(SIG_DIR, sig_filename)

    try:
        content = await signature.read()
        with open(sig_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Failed to save signature: {e}")
        raise HTTPException(status_code=500, detail="Failed to save signature")

    return {"message": "Signature saved", "session_id": session_id}


# ─── Submit Consent ──────────────────────────────────────────────────────────

@router.post("/submit", response_model=ConsentSubmitResponse)
async def submit_consent(request: ConsentSubmitRequest, raw_request: Request):
    """
    Finalize consent: validate signature, summarize Q&A, generate PDF.
    PDF path is saved to the consents DB table for admin tracking.
    Session status is updated to 'completed'.
    """
    session_id = request.session_id

    conn = get_connection()
    try:
        # Validate session — fetch ALL fields including clinic extras
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")

        session = dict(row)

        # Validate signature exists
        sig_path = os.path.join(SIG_DIR, f"{session_id}.png")
        if not os.path.exists(sig_path):
            raise HTTPException(status_code=400, detail="Signature not found. Please sign the consent form.")

        # Validate declaration
        if not request.declaration_checked:
            raise HTTPException(status_code=400, detail="You must check the declaration checkbox.")

        # Load procedure content
        proc = load_procedure_content(session["procedure_id"])

        # Fetch Q&A log
        qa_rows = conn.execute(
            "SELECT question, answer, timestamp FROM qa_log WHERE session_id = ? ORDER BY timestamp ASC",
            (session_id,),
        ).fetchall()
        qa_pairs = [dict(r) for r in qa_rows]

        # Generate Q&A summary
        qa_summary = summarize_qa(qa_pairs)

        # Generate PDF
        pdf_path = generate_consent_pdf(session, proc, qa_summary, sig_path)

        # Save to consents table so admin can track and download PDFs
        conn.execute(
            """INSERT OR REPLACE INTO consents
               (session_id, pdf_path, signature_path, signed_at)
               VALUES (?, ?, ?, ?)""",
            (
                session_id,
                pdf_path,
                f"{session_id}.png",
                datetime.now().isoformat(),
            ),
        )

        # Update session status to completed
        conn.execute("UPDATE sessions SET status = 'completed' WHERE id = ?", (session_id,))
        conn.commit()

        return ConsentSubmitResponse(
            pdf_url=f"/storage/pdfs/{os.path.basename(pdf_path)}",
            pdf_path=pdf_path,
            session_id=session_id,
        )

    finally:
        conn.close()


# ─── Consent History ─────────────────────────────────────────────────────────

@router.get("/history")
async def get_consent_history(request: Request):
    """List all consent records for the authenticated user."""
    token = _get_active_token(request)
    user_id = _get_user_id_from_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT c.id, c.session_id, c.pdf_path, c.signed_at, c.qa_summary,
                      s.patient_name, s.procedure_id, s.tooth, s.clinic_name, s.doctor_name
               FROM consents c
               JOIN sessions s ON c.session_id = s.id
               WHERE c.user_id = ?
               ORDER BY c.signed_at DESC""",
            (user_id,),
        ).fetchall()

        records = []
        for r in rows:
            records.append({
                "id": r["id"],
                "session_id": r["session_id"],
                "patient_name": r["patient_name"],
                "procedure_id": r["procedure_id"],
                "tooth": r["tooth"],
                "clinic_name": r["clinic_name"],
                "doctor_name": r["doctor_name"],
                "signed_at": r["signed_at"],
                "qa_summary": r["qa_summary"],
                "pdf_url": f"/storage/pdfs/{os.path.basename(r['pdf_path'])}" if r["pdf_path"] else None,
            })

        return records

    finally:
        conn.close()


@router.get("/history/{session_id}")
async def get_consent_detail(request: Request, session_id: str):
    """Get details of a specific consent record for the authenticated user."""
    token = _get_active_token(request)
    user_id = _get_user_id_from_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conn = get_connection()
    try:
        row = conn.execute(
            """SELECT c.*, s.patient_name, s.procedure_id, s.tooth, s.clinic_name, s.doctor_name
               FROM consents c
               JOIN sessions s ON c.session_id = s.id
               WHERE c.session_id = ? AND c.user_id = ?""",
            (session_id, user_id),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Consent record not found")

        return {
            "session_id": row["session_id"],
            "patient_name": row["patient_name"],
            "procedure_id": row["procedure_id"],
            "tooth": row["tooth"],
            "clinic_name": row["clinic_name"],
            "doctor_name": row["doctor_name"],
            "signed_at": row["signed_at"],
            "qa_summary": row["qa_summary"],
            "pdf_url": f"/storage/pdfs/{os.path.basename(row['pdf_path'])}" if row["pdf_path"] else None,
            "signature_url": f"/storage/signatures/{os.path.basename(row['signature_path'])}" if row["signature_path"] else None,
        }

    finally:
        conn.close()


@router.get("/download/{session_id}")
async def download_consent(request: Request, session_id: str):
    """Download the PDF for a specific consent record."""
    token = _get_active_token(request)
    user_id = _get_user_id_from_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conn = get_connection()
    try:
        row = conn.execute(
            """SELECT pdf_path FROM consents WHERE session_id = ? AND user_id = ?""",
            (session_id, user_id),
        ).fetchone()

        if not row or not row["pdf_path"]:
            raise HTTPException(status_code=404, detail="PDF not found")

        pdf_path = row["pdf_path"]
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF file not found on disk")

        return FastAPIFileResponse(pdf_path, media_type="application/pdf", filename=f"consent_{session_id}.pdf")

    finally:
        conn.close()
"""Sessions router — create patient sessions. No user authentication required."""

import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request

from schemas import CreateSessionRequest, SessionResponse
from database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(request: CreateSessionRequest):
    """Create a new patient consent session. No authentication required."""
    session_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat()

    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO sessions (id, patient_name, procedure_id, tooth, clinic_name, doctor_name,
                clinic_address, clinic_phone, clinic_email, clinic_website, created_at, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress')""",
            (session_id, request.patient_name, request.procedure_id, request.tooth,
             request.clinic_name or "", request.doctor_name or "",
             request.clinic_address or "", request.clinic_phone or "",
             request.clinic_email or "", request.clinic_website or "",
             created_at),
        )
        conn.commit()
        return SessionResponse(session_id=session_id)
    finally:
        conn.close()
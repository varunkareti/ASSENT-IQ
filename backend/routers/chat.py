"""Chat router — grounded Q&A for patient education."""

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException

from schemas import ChatRequest, ChatResponse
from gemini_service import load_procedure_content, answer_question
from database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def send_question(request: ChatRequest):
    """Answer a patient question grounded in the procedure content for their session."""
    session_id = request.session_id
    question = request.question

    # Load session to find procedure_id
    conn = get_connection()
    try:
        row = conn.execute("SELECT procedure_id FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        procedure_id = row["procedure_id"]

        # Load procedure content
        proc = load_procedure_content(procedure_id)
    finally:
        conn.close()

    # Get Gemini answer
    try:
        answer = answer_question(proc, question)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Log Q&A with timestamp
    timestamp = datetime.utcnow().isoformat()
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO qa_log (session_id, question, answer, timestamp) VALUES (?, ?, ?, ?)",
            (session_id, question, answer, timestamp),
        )
        conn.commit()
    finally:
        conn.close()

    return ChatResponse(answer=answer)
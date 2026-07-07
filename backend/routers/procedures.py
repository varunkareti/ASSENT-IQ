"""Procedures router — serves approved procedure content."""

import logging
from fastapi import APIRouter, HTTPException

from gemini_service import load_procedure_content

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/procedures", tags=["procedures"])


@router.get("/{procedure_id}")
async def get_procedure(procedure_id: str):
    """Return approved procedure content for rendering."""
    valid_ids = {"extraction", "root_canal", "dental_implant"}
    if procedure_id not in valid_ids:
        raise HTTPException(status_code=404, detail=f"Procedure not found: {procedure_id}. Valid IDs: {', '.join(valid_ids)}")

    try:
        content = load_procedure_content(procedure_id)
        return {"procedure_id": procedure_id, **content}
    except Exception as e:
        logger.error(f"Failed to load procedure {procedure_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load procedure content")
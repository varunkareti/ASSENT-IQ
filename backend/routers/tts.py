"""TTS router — generates narration script and audio for frontend playback."""

import os
import logging
from fastapi import APIRouter, HTTPException

from schemas import TTSRequest, TTSResponse, Slide
from gemini_service import load_procedure_content, generate_narration_script, text_to_speech
from gemini_service import AUDIO_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tts", tags=["tts"])


def _build_slides(procedure_json: dict) -> list[dict]:
    """Build slide data from procedure content for synced narration."""
    slides = []

    # Slide 1: Title
    slides.append({
        "text": f"Understanding Your {procedure_json['display_name']}",
        "duration_sec": 4,
    })

    # Slide 2: Diagnosis
    slides.append({
        "text": "Your Diagnosis",
        "duration_sec": 3,
    })
    slides.append({
        "text": procedure_json["diagnosis"],
        "duration_sec": 5,
    })

    # Slide 3: Treatment Steps
    slides.append({
        "text": "What the Treatment Involves",
        "duration_sec": 3,
    })
    steps = procedure_json["treatment_steps"]
    steps_display = steps[:5]
    for i, step in enumerate(steps_display, 1):
        slides.append({
            "text": f"Step {i}: {step}",
            "duration_sec": 4,
        })

    # Slide 4: Benefits
    slides.append({
        "text": "Benefits",
        "duration_sec": 3,
    })
    benefits = procedure_json["benefits"][:3]
    for b in benefits:
        slides.append({
            "text": b,
            "duration_sec": 3,
        })

    # Slide 5: Risks
    slides.append({
        "text": "Possible Risks",
        "duration_sec": 3,
    })
    risks = procedure_json["risks"][:3]
    for r in risks:
        slides.append({
            "text": r,
            "duration_sec": 3,
        })

    # Slide 6: Alternatives
    slides.append({
        "text": "Alternatives",
        "duration_sec": 3,
    })
    alternatives = procedure_json["alternatives"][:3]
    for a in alternatives:
        slides.append({
            "text": a,
            "duration_sec": 3,
        })

    # Slide 7: Closing
    slides.append({
        "text": "Your doctor will answer any more questions before you sign.",
        "duration_sec": 4,
    })

    return slides


@router.post("", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    """Generate narration audio (gTTS) and slides for frontend playback."""
    procedure_id = request.procedure_id

    # Load procedure content
    try:
        proc = load_procedure_content(procedure_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Generate narration script
    try:
        script = generate_narration_script(proc)
    except Exception as e:
        logger.error(f"Failed to generate script: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate narration script")

    # Generate audio — cache if it already exists
    audio_filename = f"{procedure_id}.wav"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)

    if os.path.exists(audio_path):
        logger.info(f"Audio file already exists: {audio_path}")
    else:
        try:
            audio_bytes = text_to_speech(script)
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)
            logger.info(f"Generated audio: {audio_path}")
        except Exception as e:
            logger.error(f"Failed to generate audio: {e}")
            # Fallback: continue without audio
            audio_path = None

    audio_url = f"/storage/audio/{audio_filename}" if audio_path else None

    # Build slides
    slides = _build_slides(proc)

    return TTSResponse(
        audio_url=audio_url,
        narration_script=script,
        slides=[Slide(text=s["text"], duration_sec=s["duration_sec"]) for s in slides],
    )

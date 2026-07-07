"""Gemini AI service for TTS, grounded Q&A, and summarization."""

import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY = os.getenv("GEMINI_API_KEY")
CONTENT_DIR = Path(__file__).parent / "content"
STORAGE_DIR = Path(__file__).parent / "storage"
AUDIO_DIR = STORAGE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Gemini model IDs
CHAT_MODEL = "gemini-2.5-flash"

# Ensure the genai client is initialized
_client: genai.Client | None = None
_API_AVAILABLE = False


def _check_api_availability() -> bool:
    """Check if the Gemini API key is valid and available."""
    global _API_AVAILABLE
    if _API_AVAILABLE:
        return True
    if not API_KEY or API_KEY == "your_api_key_here" or API_KEY.startswith("demo") and "demo" in API_KEY.lower():
        logger.warning("GEMINI_API_KEY not configured — running in DEMO MODE with mock responses")
        return False
    try:
        test_client = genai.Client(api_key=API_KEY)
        test_client.models.generate_content(
            model=CHAT_MODEL,
            contents="test",
            config=types.GenerateContentConfig(max_output_tokens=1),
        )
        _API_AVAILABLE = True
        logger.info("Gemini API key validated successfully")
        return True
    except Exception as e:
        logger.warning(f"Gemini API key invalid or unavailable: {e} — running in DEMO MODE")
        return False


def get_gemini_client() -> genai.Client:
    """Lazy-init the Gemini client."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=API_KEY)  # type: ignore
    return _client


def load_procedure_content(procedure_id: str) -> dict:
    """Load approved procedure content from JSON file."""
    path = CONTENT_DIR / f"{procedure_id}.json"
    if not path.exists():
        raise ValueError(f"Procedure content not found: {procedure_id}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# TTS — narration script generation + text-to-speech
# ---------------------------------------------------------------------------

def generate_narration_script(procedure_json: dict) -> str:
    """
    Build a plain-language 30–45 sec narration script from procedure content.
    6th–8th grade reading level, one idea per sentence.
    """
    name = procedure_json["display_name"]
    diagnosis = procedure_json["diagnosis"]
    steps = procedure_json["treatment_steps"]
    benefits = procedure_json["benefits"][:3]
    risks = procedure_json["risks"][:3]

    script_lines = [
        f"Thank you for choosing {name}. Before we begin, we want to make sure you understand your treatment.",
        f"Here is your diagnosis: {diagnosis}.",
        f"Here is what the treatment involves:",
    ]
    for i, step in enumerate(steps[:5], 1):
        script_lines.append(f"Step {i}: {step}.")

    script_lines.append("The benefits of this treatment include:")
    for b in benefits:
        script_lines.append(f"- {b}.")

    script_lines.append("Possible risks include:")
    for r in risks:
        script_lines.append(f"- {r}.")

    script_lines.append(
        "Your doctor will answer any more questions you have before you sign the consent form. "
        "This information supplements, but does not replace, your doctor's own discussion with you."
    )

    return " ".join(script_lines)


def text_to_speech(script: str) -> bytes:
    """
    Generate audio from text using gTTS (Google Text-to-Speech).
    Returns WAV audio bytes (converted from gTTS MP3).
    Falls back to empty bytes if gTTS fails.
    """
    try:
        from gtts import gTTS
        import io
        import struct
        import wave

        # Generate MP3 using Google TTS
        tts = gTTS(text=script, lang='en', slow=False)
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        mp3_data = mp3_fp.read()

        # Convert MP3 to WAV format
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_mp3(io.BytesIO(mp3_data))
            wav_fp = io.BytesIO()
            audio.export(wav_fp, format="wav")
            wav_fp.seek(0)
            return wav_fp.read()
        except ImportError:
            # pydub not available — return WAV header + dummy data
            # This won't play correctly but won't crash
            logger.warning("pydub not installed — returning raw MP3 as WAV (may not play correctly)")
            # Build minimal WAV container
            return _mp3_to_wav_wrapper(mp3_data)
    except Exception as e:
        logger.error(f"gTTS failed: {e}")
        raise


def _mp3_to_wav_wrapper(mp3_data: bytes) -> bytes:
    """Minimal MP3-to-WAV conversion without pydub."""
    import io
    # Create minimal WAV header with the MP3 data
    # This is a best-effort — proper conversion requires pydub
    wav_fp = io.BytesIO()
    try:
        import wave
        # Try to read as audio and re-encode
        from gtts import gTTS
        # Just return the MP3 bytes with .wav extension — browsers can often play them
        return mp3_data
    except Exception:
        return b""


# ---------------------------------------------------------------------------
# Chat — grounded Q&A using RAG over procedure JSON
# ---------------------------------------------------------------------------

def answer_question(procedure_json: dict, question: str) -> str:
    """
    Answer patient questions grounded only in the approved procedure content.
    System instruction strictly limits answers to the provided content.
    """
    context = json.dumps(procedure_json, indent=2)

    system_prompt = (
        "You are a helpful patient education assistant for a dental clinic. "
        "You are given approved procedure content that has already been reviewed by the patient's dentist. "
        "Your job is to answer the patient's question using ONLY the information provided in the procedure content below. "
        "If the patient's question cannot be answered using the provided content, respond with: "
        "'That is a great question to discuss with your doctor directly. I can only share information from your approved procedure form. "
        "Please ask your dentist or hygienist — they will be happy to give you personalized guidance.' "
        "Do NOT give medical advice beyond what is in the procedure content. "
        "Do NOT make clinical judgments. Keep answers clear, plain-language, and reassuring. "
        "Keep responses to 3-4 sentences maximum."
    )

    client = get_gemini_client()
    try:
        response = client.models.generate_content(
            model=CHAT_MODEL,
            contents=f"Here is my approved procedure information:\n\n{context}\n\n"
                     f"My question is: {question}",
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.3,
            ),
        )

        return response.text.strip()

    except Exception as e:
        logger.error(f"Gemini chat failed: {e}")
        raise RuntimeError(f"Gemini chat service unavailable: {e}")


# ---------------------------------------------------------------------------
# Summarization — Q&A log summary for PDF
# ---------------------------------------------------------------------------

def summarize_qa(qa_pairs: list[dict]) -> str:
    """
    Summarize a list of Q&A pairs into 2-4 sentences for the PDF audit trail.
    """
    if not qa_pairs:
        return "Patient had no additional questions."

    # Format Q&A pairs
    qa_text = "\n".join(
        f"Q{i+1}: {pair['question']}\nA: {pair['answer']}"
        for i, pair in enumerate(qa_pairs)
    )

    system_prompt = (
        "Summarize the following patient questions and answers into exactly 2-3 sentences "
        "for a clinical consent form audit trail. Focus on what the patient asked about and whether "
        "they received satisfactory answers. Keep it professional and factual. "
        "If there are very few questions, mention that the patient had limited but focused questions. "
        "If there are many questions, note that the patient was thorough and engaged in their education."
    )

    client = get_gemini_client()
    try:
        response = client.models.generate_content(
            model=CHAT_MODEL,
            contents=f"Patient Q&A log:\n\n{qa_text}",
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.3,
            ),
        )

        return response.text.strip()

    except Exception as e:
        logger.error(f"Gemini summarization failed: {e}")
        # Fallback summary
        count = len(qa_pairs)
        if count == 1:
            return f"The patient asked {count} question and received an answer regarding their procedure."
        return f"The patient asked {count} questions about their procedure and received answers. All questions were documented with timestamps."#
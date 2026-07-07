"""AssentIQ — AI Dental Consent Assistant. FastAPI application."""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import init_db
from routers import procedures, tts, chat, consent, sessions, auth, admin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("Initializing AssentIQ database...")
    init_db()
    logger.info("AssentIQ started successfully.")
    yield
    logger.info("Shutting down AssentIQ.")


app = FastAPI(
    title="AssentIQ",
    description="AI-Native Informed Consent System for Dental Clinics",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(procedures.router)
app.include_router(tts.router)
app.include_router(chat.router)
app.include_router(consent.router)
app.include_router(sessions.router)

# Static file serving for storage
STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")

# Audio files
AUDIO_DIR = os.path.join(STORAGE_DIR, "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

# Signature files
SIGNATURES_DIR = os.path.join(STORAGE_DIR, "signatures")
os.makedirs(SIGNATURES_DIR, exist_ok=True)

# PDF files
PDFS_DIR = os.path.join(STORAGE_DIR, "pdfs")
os.makedirs(PDFS_DIR, exist_ok=True)

app.mount("/storage/audio", StaticFiles(directory=AUDIO_DIR), name="audio")
app.mount("/storage/signatures", StaticFiles(directory=SIGNATURES_DIR), name="signatures")
app.mount("/storage/pdfs", StaticFiles(directory=PDFS_DIR), name="pdfs")


@app.get("/health")
async def health_check():
    """Health check endpoint for judges/demo."""
    return {
        "status": "healthy",
        "service": "AssentIQ",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


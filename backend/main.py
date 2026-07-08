"""AssentIQ — AI Dental Consent Assistant. FastAPI application."""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from routers import procedures, tts, chat, consent, sessions, auth, admin

# Allow frontend from any origin in production (Railway subdomain)
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
# Build frontend into backend/public so we can serve it statically
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "public")

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

# Track if frontend dist exists for SPA catch-all and static serving
FRONTEND_BUILT = os.path.exists(FRONTEND_DIST)

# CORS — allow Vite dev server + Railway production frontend
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "http://127.0.0.1:5173",
]
# Add Railway frontend URL if set
if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)
# In production, also allow any .railway.app subdomain
if FRONTEND_URL.endswith('.railway.app') or os.getenv("RAILWAY_ENVIRONMENT"):
    allowed_origins.append("https://*.railway.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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

# Health check MUST be before static files mount (otherwise /health returns index.html)
@app.get("/health")
async def health_check():
    """Health check endpoint for judges/demo."""
    return {
        "status": "healthy",
        "service": "AssentIQ",
        "version": "1.0.0",
    }


# Catch-all SPA route: serve index.html for any non-API, non-asset path
# This MUST be BEFORE StaticFiles mount to handle SPA routes like /admin, /welcome, etc.
# Exclude /assets/*, /api/*, /storage/* paths to avoid returning index.html for JS/CSS/API requests
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def spa_catch_all(path: str, request: Request):
    """Serve index.html for SPA client-side routing."""
    # Skip if this looks like an asset, API, or storage path
    if path.startswith("assets/") or path.startswith("api/") or path.startswith("storage/"):
        raise HTTPException(status_code=404, detail="Not found")
    if FRONTEND_BUILT:
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Frontend not built")


# Serve frontend static assets (built by Vite) - MUST be AFTER catch-all
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
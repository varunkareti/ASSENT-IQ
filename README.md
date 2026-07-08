# AssentIQ — AI-Native Informed Consent System for Dental Clinics

## Overview

AssentIQ replaces paper handouts and SMS consent links with a **tablet-based, AI-guided informed consent workflow**. It uses multi-modal interaction (voice, chat, real-time explanation, visual cards) so that patients understand procedures in plain language before consenting.

## Key Features

- **AI-Powered Consent Workflow**: Interactive chatbot explains procedures, risks, and recovery in plain language
- **Multi-Modal Support**: Voice, chat, and visual explanations for diverse patient needs
- **Digital Signatures**: Patients sign consent digitally on the tablet
- **Professional PDF Generation**: Auto-generates a timestamped, auditable consent record PDF
- **Session Management**: Track consent sessions from start to completion
- **Admin Dashboard**: Manage procedures, monitor sessions, and review consent records

## How It Works

1. **Enter Patient Info** — Provide patient name, procedure type, and clinic details
2. **AI Explains Procedure** — The chatbot explains the procedure, risks, and recovery in plain language
3. **Sign & Complete** — Patient signs digitally and receives a professional PDF consent form

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.11), SQLAlchemy, SQLite |
| Frontend | React 18, Vite, React Router |
| AI | Google Gemini API |
| Deployment | Docker, Railway |

## Project Structure

```
├── backend/           # FastAPI backend
│   ├── routers/       # API route handlers
│   ├── main.py        # Application entry point
│   ├── database.py    # Database setup
│   └── gemini_service.py  # AI chat integration
├── frontend/          # React frontend
│   ├── src/screens/   # Page components
│   └── src/components/ # Reusable components
├── Dockerfile         # Multi-stage build
└── railway.toml       # Railway deployment config
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Gemini API key

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Gemini API key
python main.py
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Frontend Environment (`.env`)
```env
VITE_API_URL=http://localhost:8000
```

## Deployment

### Railway

This project is configured for one-click deployment on Railway using a Dockerfile.

1. Connect your GitHub repo to Railway
2. Deploy the `assentiq-backend` service
3. Set environment variables:
   - `GEMINI_API_KEY` — Your Google Gemini API key
   - `DATABASE_URL` — Optional, defaults to SQLite

The Dockerfile builds the React frontend and serves it statically from the FastAPI backend, handling both frontend and backend in a single container.

## License

© 2026 AssentIQ. All rights reserved.
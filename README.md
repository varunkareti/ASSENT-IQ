# AssentIQ — AI-Native Informed Consent System for Dental Clinics

AssentIQ is a comprehensive, AI-powered informed consent system designed specifically for dental clinics. It replaces traditional paper-based consent forms with an interactive, tablet-based workflow that educates patients, answers their questions through AI, captures digital signatures, and generates professionally formatted consent PDFs.

---

## 💡 Problem Statement

The informed consent process in dental practices typically follows this pattern:

1. Patient arrives for procedure
2. Staff hands them a printed consent form
3. Patient quickly reads (or skips) the dense legal/medical text
4. Patient signs without fully understanding
5. Form sits in a filing cabinet — possibly lost over time

This process creates multiple problems:

## 🏗 Solution Overview

AssentIQ delivers a complete, end-to-end consent workflow that addresses every gap in the traditional process:

| Feature | Description | Value |
|---------|-------------|-------|
| **AI Narrated Slide Deck** | Animated, procedure-specific slides with professional audio narration | Patients understand before signing |
| **Grounded AI Chat** | Q&A system restricted to approved clinical content | Safe, accurate answers |
| **Electronic Signature** | Touch/stylus signature capture on tablets | Legally binding, verifiable |
| **Professional PDF Generation** | Audit-ready consent documents with full discussion record | Legal defense asset |
| **Complete Audit Trail** | Timestamped Q&A log, signature verification, session tracking | Evidence chain |

---

## 💻 Technology Stack

### Backend — FastAPI 

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.104+ | Web framework, API routing, request/response handling |
| `uvicorn` | 0.24+ | ASGI server for running the FastAPI application |
| `pydantic` | 2.x | Data validation, serialization, request/response models |
| `google-genai` | 0.x | Google Gemini API client for AI services |
| `reportlab` | 4.x | Professional PDF generation with full formatting control |
| `python-multipart` | 0.0.6 | Form data parsing for file uploads (signatures) |
| `python-dotenv` | 1.0+ | Environment variable loading from `.env` files |
| `PyJWT` | 2.x | JWT token creation and verification for admin authentication |

### Frontend — React 18 + Vite (JavaScript)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.x | UI component library with hooks and Context API |
| `react-dom` | 18.x | DOM rendering for React components |
| `react-router-dom` | 6.x | Client-side routing between consent screens |
| `vite` | 5.x | Build tool and development server |
| `pdfjs-dist` | 3.x | PDF viewer for displaying generated consent forms |

### Database — SQLite

### AI Engine — Google Gemini API


## 🏛 Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React Frontend (Vite)                     │   │
│  │                                                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Welcome  │ │ Explain  │ │  Chat/QA │ │  Signature   │  │   │
│  │  │ Screen   │ │ Screen   │ │  Screen  │ │   Screen     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │                                                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │   Done   │ │  Admin   │ │  User    │ │  Components  │  │   │
│  │  │  Screen  │ │  Login   │ │  Dashboard│ │ (ChatBox,   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ │  SlideDeck,  │  │   │
│  │                                        │  SignaturePad)│  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │ HTTP/JSON                               │
└─────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                        API GATEWAY LAYER                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   FastAPI Backend                            │   │
│  │                                                             │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │                 Router Layer                          │  │   │
│  │  │  auth  │ procedures │ tts │ chat │ consent │ admin  │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                             │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │              Service Layer                           │  │   │
│  │  │  gemini_service  │  pdf_service  │  database         │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                             │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │            Security Middleware                        │  │   │
│  │  │  JWT Auth │ Rate Limiting │ CORS │ Input Validation  │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
│   SQLite     │  │  Gemini API  │  │   Local File     │
│   Database   │  │  (Cloud)     │  │   Storage        │
│              │  │              │  │                  │
│ sessions     │  │ TTS/Chat/    │  │ PDFs/            │
│ consents     │  │ Summarization│  │ Signatures/      │
│ qa_log       │  │              │  │ Audio            │
│ users        │  │              │  │                  │
└───────────────┘  └──────────────┘  └──────────────────┘
```


## 🤖 AI Concepts & Implementation

### Text-to-Speech (TTS) — AI Narration
Text-to-Speech converts written text into natural-sounding speech audio. This is a core AI capability used in accessibility tools, virtual assistants, and educational applications.

**How AssentIQ uses it:**
- When a patient selects a procedure (e.g., "Root Canal"), the backend loads the approved content from `backend/content/root_canal.json`
- This content is sent to Gemini with a prompt requesting a professional narration script broken into timed segments
- Gemini generates: a full narration script, slide timings, and an audio URL
- The audio file is stored locally and played on the frontend with automatic slide synchronization

### RAG Based Conversational AI — Grounded Q&A
Retrieval-Augmented Generation (RAG) combines information retrieval with large language model generation. The system first retrieves relevant context from a known corpus, then uses that context to ground the LLM's response — preventing hallucination.

**How AssentIQ uses it:**
- Patient types a question about their procedure
- The backend retrieves the approved procedure content from the JSON files
- The question + procedure content is sent to Gemini with instructions: "Answer ONLY using the provided content"
- Gemini generates a response that is strictly limited to approved clinical information
- If the question cannot be answered from the content, Gemini returns a redirect to ask the dentist

### AI Summarization — Q&A Audit Trail
Text summarization uses NLP to extract or generate a condensed version of longer text while preserving key information. Extractive summarization selects important sentences; abstractive summarization generates new text.

**How AssentIQ uses it:**
- At consent submission, all Q&A pairs from the session are collected
- Gemini receives a prompt asking for a concise summary of patient concerns
- The summary captures the key topics discussed and patient's areas of concern
- This summary is embedded in the final consent PDF as evidence of thorough discussion

### Document Generation — Professional Consent PDF

Template-based document generation combines structured data with formatted templates to produce professional documents. When combined with AI-generated content (summaries, Q&A), it creates dynamic, personalized documents.

**How AssentIQ uses it:**
- The PDF service loads: session data, procedure content, AI-generated Q&A summary, patient signature
- reportlab creates a multi-page, professionally formatted consent document
- The document includes: clinic branding, patient information, diagnosis/prognosis, procedure details, risks/alternatives, Q&A summary, signature block, and audit trail

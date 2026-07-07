"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional


# --- Session Schemas ---

class CreateSessionRequest(BaseModel):
    patient_name: str = Field(..., min_length=1, max_length=200)
    procedure_id: str = Field(..., pattern="^(extraction|root_canal|dental_implant)$")
    tooth: Optional[str] = Field(None, max_length=50)
    clinic_name: Optional[str] = Field(None, max_length=200)
    doctor_name: Optional[str] = Field(None, max_length=200)
    clinic_address: Optional[str] = Field(None, max_length=300)
    clinic_phone: Optional[str] = Field(None, max_length=50)
    clinic_email: Optional[str] = Field(None, max_length=200)
    clinic_website: Optional[str] = Field(None, max_length=200)


class SessionResponse(BaseModel):
    session_id: str


# --- TTS Schemas ---

class TTSRequest(BaseModel):
    procedure_id: str = Field(..., in_=["extraction", "root_canal", "dental_implant"])


class Slide(BaseModel):
    text: str
    duration_sec: int


class TTSResponse(BaseModel):
    audio_url: Optional[str] = None
    narration_script: str
    slides: list[Slide]


# --- Chat Schemas ---

class ChatRequest(BaseModel):
    session_id: str
    question: str = Field(..., min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    answer: str


# --- Signature Schemas ---

class SignatureResponse(BaseModel):
    message: str
    session_id: str


# --- Consent Submit Schemas ---

class ConsentSubmitRequest(BaseModel):
    session_id: str
    declaration_checked: bool = True
    watched_video: bool = True


class ConsentSubmitResponse(BaseModel):
    pdf_url: str
    pdf_path: str
    session_id: str


# --- Procedure Schemas ---

class ProcedureContent(BaseModel):
    id: str
    display_name: str
    diagnosis: str
    treatment_steps: list[str]
    benefits: list[str]
    risks: list[str]
    alternatives: list[str]
    risks_of_declining: str
    prognosis: str


# --- User/Auth Schemas ---

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    clinic_name: str
    role: str
    created_at: str
    last_login: Optional[str] = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    user: UserResponse
    session_token: str


# --- Consent History Schemas ---

class ConsentRecord(BaseModel):
    id: int
    session_id: str
    patient_name: str
    procedure_id: str
    tooth: Optional[str] = None
    clinic_name: Optional[str] = None
    doctor_name: Optional[str] = None
    signed_at: str
    qa_summary: Optional[str] = None
    pdf_url: Optional[str] = None

    model_config = {"from_attributes": True}

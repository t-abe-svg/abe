from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    TRANSCRIBING = "transcribing"
    GENERATING = "generating"
    COMPLETED = "completed"
    ERROR = "error"


class MeetingCreate(BaseModel):
    title: Optional[str] = None
    meeting_date: Optional[datetime] = None
    location: Optional[str] = None
    participants: Optional[List[str]] = None
    purpose: Optional[str] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_date: Optional[datetime] = None
    location: Optional[str] = None
    participants: Optional[List[str]] = None
    purpose: Optional[str] = None
    transcription: Optional[str] = None
    minutes: Optional[str] = None


class MeetingResponse(BaseModel):
    id: int
    file_name: str
    file_size: int
    title: Optional[str] = None
    meeting_date: Optional[datetime] = None
    location: Optional[str] = None
    participants: Optional[List[str]] = None
    purpose: Optional[str] = None
    status: ProcessingStatus
    transcription: Optional[str] = None
    minutes: Optional[str] = None
    progress: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MeetingListResponse(BaseModel):
    meetings: List[MeetingResponse]
    total: int


class UploadResponse(BaseModel):
    id: int
    file_name: str
    file_size: int
    message: str


class TranscriptionResponse(BaseModel):
    id: int
    transcription: str
    duration_seconds: Optional[float] = None


class MinutesResponse(BaseModel):
    id: int
    minutes: str
    subject: str


class EmailData(BaseModel):
    to: List[str] = Field(default_factory=list)
    cc: List[str] = Field(default_factory=list)
    bcc: List[str] = Field(default_factory=list)
    subject: str
    body: str


class ProgressUpdate(BaseModel):
    id: int
    status: ProcessingStatus
    progress: int
    message: Optional[str] = None

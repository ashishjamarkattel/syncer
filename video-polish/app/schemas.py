from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class VideoCreate(BaseModel):
    voice: Optional[str] = None


class VideoUpdate(BaseModel):
    voice: Optional[str] = None
    caption_style: Optional[str] = None


class VideoResponse(BaseModel):
    id: str
    status: str
    filename: str
    voice: str
    caption_style: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VideoStatusResponse(BaseModel):
    id: str
    status: str

    model_config = {"from_attributes": True}


class SegmentResponse(BaseModel):
    id: int
    index: int
    original_start: float
    original_end: float
    original_text: str
    cleaned_text: Optional[str] = None
    tts_duration: Optional[float] = None

    model_config = {"from_attributes": True}


class SegmentUpdate(BaseModel):
    cleaned_text: str


class RecaptionRequest(BaseModel):
    caption_style: str  # "none" or a valid style id


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    segments: list[SegmentResponse]

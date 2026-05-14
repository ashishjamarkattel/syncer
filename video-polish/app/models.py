from __future__ import annotations
from dataclasses import dataclass
from typing import Optional


@dataclass
class Video:
    id: str
    filename: str
    voice: str
    user_id: Optional[str] = None
    status: str = "uploaded"
    caption_style: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_row(cls, row: dict) -> Video:
        return cls(
            id=row["id"],
            filename=row["filename"],
            voice=row["voice"],
            user_id=row.get("user_id"),
            status=row.get("status", "uploaded"),
            caption_style=row.get("caption_style"),
            error_message=row.get("error_message"),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )


@dataclass
class Segment:
    id: int
    video_id: str
    index: int
    original_start: float
    original_end: float
    original_text: str
    cleaned_text: Optional[str] = None
    tts_path: Optional[str] = None
    tts_duration: Optional[float] = None

    @classmethod
    def from_row(cls, row: dict) -> Segment:
        return cls(
            id=row["id"],
            video_id=row["video_id"],
            index=row["index"],
            original_start=row["original_start"],
            original_end=row["original_end"],
            original_text=row["original_text"],
            cleaned_text=row.get("cleaned_text"),
            tts_path=row.get("tts_path"),
            tts_duration=row.get("tts_duration"),
        )

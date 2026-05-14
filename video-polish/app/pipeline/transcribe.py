import json
import logging
import os

from openai import OpenAI

from app.config import settings
from app.db import supabase
from app.models import Video
from app.utils.ffmpeg import run_ffmpeg, has_audio_stream

logger = logging.getLogger(__name__)


def _merge_segments(segments: list, min_duration: float = 4.0, min_words: int = 8) -> list[dict]:
    """
    Merge consecutive Whisper segments until each chunk meets min_duration and
    min_words, but never merge across a sentence boundary (segment ending in
    . ! ?).  This keeps the count manageable without splitting natural sentences.
    """
    merged: list[dict] = []
    current: dict | None = None

    for seg in segments:
        text = seg.text.strip()
        if current is None:
            current = {"start": seg.start, "end": seg.end, "text": text}
            continue

        duration = current["end"] - current["start"]
        word_count = len(current["text"].split())
        ends_sentence = current["text"][-1] in ".!?"

        if ends_sentence and duration >= min_duration and word_count >= min_words:
            merged.append(current)
            current = {"start": seg.start, "end": seg.end, "text": text}
        else:
            current["end"] = seg.end
            current["text"] = current["text"] + " " + text

    if current:
        merged.append(current)

    return merged


def transcribe(video: Video, video_dir: str, source_path: str) -> None:
    logger.info("[transcribe] start video_id=%s", video.id)

    if not has_audio_stream(source_path):
        raise RuntimeError("Unable to find audio. Is it the correct file?")

    audio_dir = os.path.join(video_dir, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    audio_path = os.path.join(audio_dir, "extracted.wav")

    run_ffmpeg([
        "-i", source_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        "-y", audio_path,
    ])
    logger.info("[transcribe] audio extracted to %s", audio_path)

    client = OpenAI(api_key=settings.openai_api_key)
    with open(audio_path, "rb") as f:
        response = client.audio.transcriptions.create(
            model=settings.whisper_model,
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"],
        )

    words = response.words or []

    # Merge Whisper's fine-grained segments into coarser chunks.
    # Whisper often produces 30-40 tiny segments for a 5-min video; merging keeps
    # the segment count reasonable (< 15) which directly reduces TTS calls and
    # filter_complex size.
    merged = _merge_segments(list(response.segments), min_duration=4.0, min_words=8)
    logger.info("[transcribe] %d whisper segments → %d merged segments", len(response.segments), len(merged))

    rows = []
    word_map: dict[int, list] = {}

    for idx, seg in enumerate(merged):
        seg_words = [
            {"word": w.word, "start": w.start, "end": w.end}
            for w in words
            if seg["start"] <= w.start <= seg["end"]
        ]
        word_map[idx] = seg_words
        rows.append({
            "video_id": video.id,
            "index": idx,
            "original_start": seg["start"],
            "original_end": seg["end"],
            "original_text": seg["text"],
        })

    total_words = sum(len(r["original_text"].split()) for r in rows)
    if total_words < 5:
        logger.warning("[transcribe] total word count %d < 5, treating as noise", total_words)
        raise RuntimeError("Unable to find audio. Is it the correct file?")

    supabase.table("segments").insert(rows).execute()

    # Persist word timestamps to disk — only sync.py needs them
    wt_path = os.path.join(video_dir, "raw", "word_timestamps.json")
    with open(wt_path, "w") as f:
        json.dump(word_map, f)

    logger.info("[transcribe] persisted %d segments", len(rows))

import json
import logging
import os

from openai import OpenAI

from app.config import settings
from app.db import supabase
from app.models import Video
from app.utils.ffmpeg import run_ffmpeg, has_audio_stream

logger = logging.getLogger(__name__)


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

    # Build segment rows (no word_timestamps — stored separately on disk)
    rows = []
    word_map: dict[int, list] = {}  # insert_idx → list of word dicts

    for idx, seg in enumerate(response.segments):
        seg_words = [
            {"word": w.word, "start": w.start, "end": w.end}
            for w in words
            if seg.start <= w.start <= seg.end
        ]
        word_map[idx] = seg_words
        rows.append({
            "video_id": video.id,
            "index": idx,
            "original_start": seg.start,
            "original_end": seg.end,
            "original_text": seg.text.strip(),
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

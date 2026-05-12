import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

from openai import OpenAI

from app.config import settings
from app.db import supabase, get_segments
from app.models import Video
from app.utils.ffmpeg import get_duration

logger = logging.getLogger(__name__)

_MAX_WORKERS = 2


def _generate_segment(client: OpenAI, seg, tts_dir: str, voice: str) -> tuple:
    tts_path = os.path.join(tts_dir, f"seg_{seg.index}.wav")

    if os.path.isfile(tts_path) and seg.tts_duration:
        logger.debug("[tts] seg_%d cached, skipping", seg.index)
        return seg, tts_path, None

    text = seg.cleaned_text or seg.original_text
    response = client.audio.speech.create(
        model=settings.tts_model,
        voice=voice,
        input=text,
        response_format="wav",
    )
    response.stream_to_file(tts_path)
    duration = get_duration(tts_path)
    logger.debug("[tts] seg_%d done, duration=%.2fs", seg.index, duration)
    return seg, tts_path, duration


def generate_tts(video: Video, video_dir: str) -> None:
    logger.info("[tts] start video_id=%s", video.id)
    tts_dir = os.path.join(video_dir, "tts")
    os.makedirs(tts_dir, exist_ok=True)

    segments = get_segments(video.id)
    client = OpenAI(api_key=settings.openai_api_key)

    with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as pool:
        futures = {
            pool.submit(_generate_segment, client, seg, tts_dir, video.voice): seg
            for seg in segments
        }
        for future in as_completed(futures):
            seg, tts_path, duration = future.result()
            if duration is not None:
                supabase.table("segments").update({
                    "tts_path": os.path.relpath(tts_path),
                    "tts_duration": duration,
                }).eq("id", seg.id).execute()

    logger.info("[tts] done, %d segments", len(segments))

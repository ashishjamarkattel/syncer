import json
import logging
import os

from app.db import get_segments
from app.models import Video
from app.pipeline.silence import compute_speech_regions

logger = logging.getLogger(__name__)

STRETCH_MIN = 0.85
STRETCH_MAX = 1.2


def sync_segments(video: Video, video_dir: str, source_path: str) -> None:
    """Compute per-segment timing metadata only — no ffmpeg encoding."""
    logger.info("[sync] computing timing for video_id=%s", video.id)

    segments = get_segments(video.id)

    wt_path = os.path.join(video_dir, "raw", "word_timestamps.json")
    with open(wt_path) as f:
        word_map: dict[str, list] = json.load(f)

    timing = []
    for seg in segments:
        words = word_map.get(str(seg.index), [])
        regions = compute_speech_regions(words, seg.original_start, seg.original_end)

        trimmed_duration = sum(e - s for s, e in regions) or 0.001
        tts_duration = seg.tts_duration or 0.0
        ratio = tts_duration / trimmed_duration
        clamped_ratio = max(STRETCH_MIN, min(STRETCH_MAX, ratio))

        needs_pad = False
        remaining = 0.0
        if ratio > STRETCH_MAX:
            remaining = tts_duration - STRETCH_MAX * trimmed_duration
            needs_pad = remaining > 0.01

        logger.debug(
            "[sync] seg_%d regions=%d ratio=%.3f tts=%.2f trimmed=%.2f",
            seg.index, len(regions), ratio, tts_duration, trimmed_duration,
        )
        timing.append({
            "index": seg.index,
            "regions": regions,
            "clamped_ratio": clamped_ratio,
            "needs_pad": needs_pad,
            "remaining": remaining,
        })

    work_dir = os.path.join(video_dir, "work")
    os.makedirs(work_dir, exist_ok=True)
    timing_path = os.path.join(work_dir, "sync_timing.json")
    with open(timing_path, "w") as f:
        json.dump(timing, f)

    logger.info("[sync] timing written for %d segments (no encoding)", len(timing))

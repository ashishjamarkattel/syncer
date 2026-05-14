import logging
import os
import shutil
import time
import traceback

from app.config import settings
from app.db import get_video, get_segments, set_status, fail_video
from app.pipeline.captions import burn_captions
from app.pipeline.cleanup import cleanup
from app.pipeline.render import render
from app.pipeline.sync import sync_segments
from app.pipeline.transcribe import transcribe
from app.pipeline.tts import generate_tts

logger = logging.getLogger(__name__)


def run_transcription_pipeline(video_id: str, storage_dir: str) -> None:
    start = time.time()
    try:
        video = get_video(video_id)
        if video is None:
            logger.error("[orchestrator] video %s not found", video_id)
            return

        video_dir = os.path.join(storage_dir, video_id)
        source_path = _find_source(os.path.join(video_dir, "raw"))
        if source_path is None:
            fail_video(video_id, "Source file not found in raw directory")
            return

        set_status(video_id, "transcribing")
        transcribe(video, video_dir, source_path)

        set_status(video_id, "cleaning")
        cleanup(video)

        set_status(video_id, "transcribed")
        logger.info("[orchestrator] video %s transcribed in %.1fs — awaiting review", video_id, time.time() - start)

    except Exception as exc:
        tb = traceback.format_exc()
        logger.error("[orchestrator] transcription failed for %s: %s\n%s", video_id, exc, tb)
        fail_video(video_id, f"{exc}\n\n{tb[-1000:]}")


def run_render_pipeline(video_id: str, storage_dir: str) -> None:
    start = time.time()
    try:
        video = get_video(video_id)
        if video is None:
            logger.error("[orchestrator] video %s not found", video_id)
            return

        video_dir = os.path.join(storage_dir, video_id)
        source_path = _find_source(os.path.join(video_dir, "raw"))
        if source_path is None:
            fail_video(video_id, "Source file not found in raw directory")
            return

        set_status(video_id, "generating_audio")
        generate_tts(video, video_dir)

        set_status(video_id, "syncing")
        sync_segments(video, video_dir, source_path)

        set_status(video_id, "rendering")
        render(video, video_dir, source_path)

        if settings.r2_enabled:
            from app import storage
            output_path = os.path.join(video_dir, "output", "polished.mp4")
            storage.upload(output_path, f"{video_id}/output/polished.mp4")

        set_status(video_id, "completed")
        logger.info("[orchestrator] video %s render done in %.1fs", video_id, time.time() - start)

    except Exception as exc:
        tb = traceback.format_exc()
        logger.error("[orchestrator] render failed for %s: %s\n%s", video_id, exc, tb)
        fail_video(video_id, f"{exc}\n\n{tb[-1000:]}")


def run_recaption_pipeline(video_id: str, storage_dir: str) -> None:
    try:
        video = get_video(video_id)
        if video is None:
            return

        video_dir = os.path.join(storage_dir, video_id)
        raw_path = os.path.join(video_dir, "output", "polished_raw.mp4")
        output_path = os.path.join(video_dir, "output", "polished.mp4")

        if not os.path.isfile(raw_path):
            fail_video(video_id, "Raw video not found — please re-generate the video first")
            return

        segments = get_segments(video_id)

        if video.caption_style:
            burn_captions(video, segments, raw_path, output_path)
        else:
            shutil.copy2(raw_path, output_path)

        if settings.r2_enabled:
            from app import storage
            storage.upload(output_path, f"{video_id}/output/polished.mp4")

        set_status(video_id, "completed")
        logger.info("[orchestrator] recaption done for %s (style=%s)", video_id, video.caption_style)

    except Exception as exc:
        tb = traceback.format_exc()
        logger.error("[orchestrator] recaption failed for %s: %s\n%s", video_id, exc, tb)
        fail_video(video_id, f"{exc}\n\n{tb[-1000:]}")


def _find_source(raw_dir: str) -> str | None:
    if not os.path.isdir(raw_dir):
        return None
    for name in os.listdir(raw_dir):
        if name.startswith("source."):
            return os.path.join(raw_dir, name)
    return None

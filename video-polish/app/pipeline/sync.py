import json
import logging
import os

from app.db import get_segments
from app.models import Video
from app.pipeline.silence import compute_speech_regions
from app.utils.ffmpeg import get_duration, run_ffmpeg

logger = logging.getLogger(__name__)


def sync_segments(video: Video, video_dir: str, source_path: str) -> None:
    logger.info("[sync] start video_id=%s", video.id)
    work_dir = os.path.join(video_dir, "work")
    os.makedirs(work_dir, exist_ok=True)
    tts_dir = os.path.join(video_dir, "tts")

    segments = get_segments(video.id)

    wt_path = os.path.join(video_dir, "raw", "word_timestamps.json")
    with open(wt_path) as f:
        word_map: dict[str, list] = json.load(f)

    for seg in segments:
        logger.info("[sync] processing seg_%d", seg.index)
        words = word_map.get(str(seg.index), [])
        regions = compute_speech_regions(words, seg.original_start, seg.original_end)
        logger.debug("[sync] seg_%d regions=%s", seg.index, regions)

        trimmed_path = os.path.join(work_dir, f"seg_{seg.index}_trimmed.mp4")
        _trim_video(source_path, regions, trimmed_path)

        trimmed_duration = get_duration(trimmed_path)
        tts_duration = seg.tts_duration or 0.0
        tts_path = os.path.join(tts_dir, f"seg_{seg.index}.wav")

        if trimmed_duration <= 0:
            trimmed_duration = 0.001

        ratio = tts_duration / trimmed_duration
        logger.debug("[sync] seg_%d ratio=%.3f tts=%.2f trimmed=%.2f", seg.index, ratio, tts_duration, trimmed_duration)

        stretched_path = os.path.join(work_dir, f"seg_{seg.index}_stretched.mp4")
        final_video_path = _apply_stretch(seg.index, trimmed_path, ratio, tts_duration, work_dir, stretched_path)

        final_path = os.path.join(work_dir, f"seg_{seg.index}_final.mp4")
        run_ffmpeg([
            "-i", final_video_path,
            "-i", tts_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            "-y", final_path,
        ])
        logger.info("[sync] seg_%d done -> %s", seg.index, final_path)

    logger.info("[sync] all segments synced")


def _trim_video(source_path: str, regions: list[tuple[float, float]], out_path: str) -> None:
    EVEN_SCALE = "scale=trunc(iw/2)*2:trunc(ih/2)*2"

    if len(regions) == 1:
        s, e = regions[0]
        run_ffmpeg([
            "-i", source_path,
            "-ss", str(s), "-to", str(e),
            "-vf", EVEN_SCALE,
            "-c:v", "libx264", "-preset", "fast",
            "-an", "-y", out_path,
        ])
        return

    filter_parts = []
    concat_inputs = ""
    for i, (s, e) in enumerate(regions):
        filter_parts.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS[v{i}]")
        concat_inputs += f"[v{i}]"

    n = len(regions)
    filter_parts.append(f"{concat_inputs}concat=n={n}:v=1,{EVEN_SCALE}[out]")
    filter_complex = "; ".join(filter_parts)

    run_ffmpeg([
        "-i", source_path,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-c:v", "libx264", "-preset", "fast",
        "-an", "-y", out_path,
    ])


def _apply_stretch(
    index: int,
    trimmed_path: str,
    ratio: float,
    tts_duration: float,
    work_dir: str,
    out_path: str,
) -> str:
    STRETCH_MIN = 0.85
    STRETCH_MAX = 1.2

    clamped_ratio = max(STRETCH_MIN, min(STRETCH_MAX, ratio))

    if ratio < STRETCH_MIN:
        logger.warning("[sync] seg_%d aggressive_compression ratio=%.3f clamped to %.2f", index, ratio, STRETCH_MIN)

    run_ffmpeg([
        "-i", trimmed_path,
        "-filter:v", f"setpts={clamped_ratio}*PTS",
        "-an", "-y", out_path,
    ])

    if ratio > STRETCH_MAX:
        stretched_duration = get_duration(out_path)
        remaining = tts_duration - stretched_duration
        if remaining > 0.01:
            padded_path = os.path.join(work_dir, f"seg_{index}_padded.mp4")
            run_ffmpeg([
                "-i", out_path,
                "-vf", f"tpad=stop_mode=clone:stop_duration={remaining:.3f}",
                "-y", padded_path,
            ])
            return padded_path

    return out_path

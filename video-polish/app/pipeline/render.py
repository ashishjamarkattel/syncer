import json
import logging
import os
import shutil

from app.db import get_segments
from app.models import Video
from app.pipeline.captions import burn_captions
from app.utils.ffmpeg import run_ffmpeg

logger = logging.getLogger(__name__)

EVEN_SCALE = "scale=trunc(iw/2)*2:trunc(ih/2)*2"


def render(video: Video, video_dir: str, source_path: str) -> None:
    logger.info("[render] start video_id=%s", video.id)

    timing_path = os.path.join(video_dir, "work", "sync_timing.json")
    with open(timing_path) as f:
        timing: list[dict] = json.load(f)

    tts_dir = os.path.join(video_dir, "tts")
    output_dir = os.path.join(video_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    n = len(timing)

    # Input 0: source video. Inputs 1..n: TTS audio files in segment order.
    inputs: list[str] = ["-i", source_path]
    for t in timing:
        inputs += ["-i", os.path.join(tts_dir, f"seg_{t['index']}.wav")]

    filter_complex = _build_filter_complex(timing)
    logger.debug("[render] filter_complex length=%d chars", len(filter_complex))

    raw_path = os.path.join(output_dir, "polished_raw.mp4")
    output_path = os.path.join(output_dir, "polished.mp4")

    run_ffmpeg([
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium",
        "-c:a", "aac",
        "-y", raw_path,
    ])

    segments = get_segments(video.id)
    if video.caption_style:
        burn_captions(video, segments, raw_path, output_path)
        logger.info("[render] captions burned (style=%s)", video.caption_style)
    else:
        shutil.copy2(raw_path, output_path)

    logger.info("[render] output written to %s", output_path)


def _build_filter_complex(timing: list[dict]) -> str:
    parts: list[str] = []
    seg_video_labels: list[str] = []

    for i, t in enumerate(timing):
        regions: list = t["regions"]
        clamped_ratio: float = t["clamped_ratio"]

        # --- trim silence regions within this segment ---
        if len(regions) == 1:
            s, e = regions[0]
            parts.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS[vtrimmed_{i}]")
        else:
            for j, (s, e) in enumerate(regions):
                parts.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS[v_{i}_{j}]")
            concat_in = "".join(f"[v_{i}_{j}]" for j in range(len(regions)))
            parts.append(f"{concat_in}concat=n={len(regions)}:v=1[vtrimmed_{i}]")

        # --- time-stretch + scale + optional freeze-pad ---
        if t["needs_pad"]:
            parts.append(
                f"[vtrimmed_{i}]setpts={clamped_ratio}*(PTS-STARTPTS),{EVEN_SCALE}[vst_{i}]"
            )
            parts.append(
                f"[vst_{i}]tpad=stop_mode=clone:stop_duration={t['remaining']:.3f}[vseg_{i}]"
            )
        else:
            parts.append(
                f"[vtrimmed_{i}]setpts={clamped_ratio}*(PTS-STARTPTS),{EVEN_SCALE}[vseg_{i}]"
            )

        seg_video_labels.append(f"[vseg_{i}]")

    n = len(timing)

    # --- concat all video segments ---
    parts.append("".join(seg_video_labels) + f"concat=n={n}:v=1[vout]")

    # --- concat all TTS audio (inputs 1..n) ---
    audio_in = "".join(f"[{i + 1}:a]" for i in range(n))
    parts.append(f"{audio_in}concat=n={n}:v=0:a=1[aout]")

    return "; ".join(parts)

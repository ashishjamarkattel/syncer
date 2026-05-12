import logging
import os
import shutil

from app.db import get_segments
from app.models import Video
from app.pipeline.captions import burn_captions
from app.utils.ffmpeg import run_ffmpeg

logger = logging.getLogger(__name__)


def render(video: Video, video_dir: str) -> None:
    logger.info("[render] start video_id=%s", video.id)
    work_dir = os.path.join(video_dir, "work")
    output_dir = os.path.join(video_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    segments = get_segments(video.id)

    concat_list_path = os.path.join(work_dir, "concat_list.txt")
    with open(concat_list_path, "w") as f:
        for seg in segments:
            final_path = os.path.abspath(os.path.join(work_dir, f"seg_{seg.index}_final.mp4"))
            f.write(f"file '{final_path}'\n")

    raw_path = os.path.join(output_dir, "polished_raw.mp4")
    output_path = os.path.join(output_dir, "polished.mp4")

    run_ffmpeg([
        "-f", "concat", "-safe", "0",
        "-i", concat_list_path,
        "-c:v", "libx264", "-preset", "medium",
        "-c:a", "aac",
        "-y", raw_path,
    ])

    if video.caption_style:
        burn_captions(video, segments, raw_path, output_path)
        logger.info("[render] captions burned in (style=%s)", video.caption_style)
    else:
        shutil.copy2(raw_path, output_path)

    logger.info("[render] output written to %s", output_path)

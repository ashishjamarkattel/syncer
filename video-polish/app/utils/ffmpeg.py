import json
import logging
import shutil
import subprocess

logger = logging.getLogger(__name__)


def run_ffmpeg(args: list[str]) -> None:
    cmd = ["ffmpeg"] + args
    logger.debug("Running: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        stderr_tail = result.stderr[-2000:] if len(result.stderr) > 2000 else result.stderr
        raise RuntimeError(f"FFmpeg failed (exit {result.returncode}):\n{stderr_tail}")


def get_duration(path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        path,
    ]
    logger.debug("ffprobe: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def has_audio_stream(path: str) -> bool:
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "a",
        "-show_entries", "stream=codec_type",
        "-of", "json",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return False
    data = json.loads(result.stdout)
    return len(data.get("streams", [])) > 0


def check_ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None

import json
import logging
import os
import subprocess
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFont

from app.models import Segment, Video

logger = logging.getLogger(__name__)

VALID_STYLES = {"classic", "bold_pop", "cinematic", "word_highlight"}

_FONT_CANDIDATES = [
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNSText.ttf",
]


@lru_cache(maxsize=16)
def _font(size: int) -> ImageFont.FreeTypeFont:
    for path in _FONT_CANDIDATES:
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, size=size)
            except Exception:
                continue
    return ImageFont.load_default()


def _video_info(path: str) -> tuple[int, int, float]:
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", path],
        capture_output=True, text=True, check=True,
    )
    for stream in json.loads(result.stdout)["streams"]:
        if stream.get("codec_type") == "video":
            num, den = stream["r_frame_rate"].split("/")
            return stream["width"], stream["height"], int(num) / int(den)
    raise RuntimeError("No video stream found")


def _caption_events(video: Video, segments: list[Segment]) -> list[dict]:
    style = video.caption_style
    events: list[dict] = []
    t = 0.0

    # size_ratio is fraction of video height used to compute font size at render time
    for seg in segments:
        dur = seg.tts_duration or 0.0
        text = (seg.cleaned_text or seg.original_text).strip()

        if style == "classic":
            events.append({"style": "classic", "start": t, "end": t + dur,
                           "text": text, "size_ratio": 0.043})

        elif style == "bold_pop":
            events.append({"style": "bold_pop", "start": t, "end": t + dur,
                           "text": text, "size_ratio": 0.066})

        elif style == "cinematic":
            events.append({"style": "cinematic", "start": t, "end": t + dur,
                           "text": text.upper(), "size_ratio": 0.039})

        elif style == "word_highlight":
            words = text.split()
            n = len(words)
            if n:
                word_dur = dur / n
                for i, word in enumerate(words):
                    events.append({
                        "style": "word_highlight",
                        "start": t + i * word_dur,
                        "end": t + (i + 1) * word_dur,
                        "text": word, "size_ratio": 0.056,
                    })

        t += dur

    return events


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_w: int, draw: ImageDraw.ImageDraw) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip() if current else word
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_w:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def _fade_alpha(seg_t: float, seg_dur: float) -> float:
    """Fade in over first 15% of duration, fade out over last 15%."""
    fade = min(0.18, seg_dur * 0.15)
    if fade <= 0:
        return 1.0
    if seg_t < fade:
        return seg_t / fade
    if seg_t > seg_dur - fade:
        return max(0.0, (seg_dur - seg_t) / fade)
    return 1.0


def _draw_alpha(img: Image.Image, event: dict, alpha: float, iw: int, ih: int) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    _draw_on(overlay, event, iw, ih, opacity=alpha)
    result = Image.alpha_composite(img.convert("RGBA"), overlay)
    img.paste(result.convert("RGB"))


def _draw_on(canvas: Image.Image, event: dict, iw: int, ih: int, opacity: float = 1.0) -> None:
    is_portrait = ih > iw
    style = event["style"]
    text = event["text"]
    size = max(16, int(ih * event["size_ratio"]))
    font = _font(size)

    draw = ImageDraw.Draw(canvas)
    max_w = int(iw * 0.88)
    lines = _wrap_text(text, font, max_w, draw)

    line_h = int(size * 1.35)
    total_h = len(lines) * line_h
    margin = int(ih * 0.08) if is_portrait else int(ih * 0.06)
    y_start = ih - total_h - margin

    def a(c: tuple) -> tuple:
        return (*c, int(255 * opacity))

    if style == "cinematic":
        pad = max(10, int(ih * 0.015))
        bar_alpha = int(160 * opacity)
        draw.rectangle(
            [0, y_start - pad, iw, y_start + total_h + pad],
            fill=(0, 0, 0, bar_alpha),
        )

    for li, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        x = (iw - lw) // 2
        y = y_start + li * line_h

        if style == "classic":
            for dx, dy in [(-2,0),(2,0),(0,-2),(0,2),(-2,-2),(2,-2),(-2,2),(2,2)]:
                draw.text((x+dx, y+dy), line, font=font, fill=a((0,0,0)))
            draw.text((x, y), line, font=font, fill=a((255,255,255)))

        elif style == "bold_pop":
            for dx, dy in [(-3,0),(3,0),(0,-3),(0,3),(-3,-3),(3,-3),(-3,3),(3,3)]:
                draw.text((x+dx, y+dy), line, font=font, fill=a((0,0,0)))
            draw.text((x, y), line, font=font, fill=a((255,220,0)))

        elif style == "cinematic":
            draw.text((x, y), line, font=font, fill=a((255,255,255)))

        elif style == "word_highlight":
            for dx, dy in [(-3,0),(3,0),(0,-3),(0,3),(-3,-3),(3,-3),(-3,3),(3,3)]:
                draw.text((x+dx, y+dy), line, font=font, fill=a((0,0,0)))
            draw.text((x, y), line, font=font, fill=a((255,220,0)))


def burn_captions(video: Video, segments: list[Segment], input_path: str, output_path: str) -> None:
    w, h, fps = _video_info(input_path)
    events = sorted(_caption_events(video, segments), key=lambda e: e["start"])
    frame_size = w * h * 3

    read_proc = subprocess.Popen(
        ["ffmpeg", "-i", input_path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-y", "pipe:1"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    write_proc = subprocess.Popen(
        [
            "ffmpeg",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-video_size", f"{w}x{h}", "-framerate", str(fps),
            "-i", "pipe:0",
            "-i", input_path,
            "-map", "0:v", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-c:a", "copy",
            "-shortest", "-y", output_path,
        ],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )

    frame_num = 0
    try:
        while True:
            raw = read_proc.stdout.read(frame_size)
            if len(raw) < frame_size:
                break

            t = frame_num / fps
            img = Image.frombytes("RGB", (w, h), raw)

            for ev in events:
                if ev["start"] <= t < ev["end"]:
                    seg_t = t - ev["start"]
                    seg_dur = ev["end"] - ev["start"]
                    alpha = _fade_alpha(seg_t, seg_dur)
                    _draw_alpha(img, ev, alpha, w, h)
                    break

            write_proc.stdin.write(img.tobytes())
            frame_num += 1
    finally:
        read_proc.stdout.close()
        read_proc.wait()
        write_proc.stdin.close()
        write_proc.wait()

    if write_proc.returncode != 0:
        raise RuntimeError("Caption burn failed during encoding")

    logger.info("[captions] burned %d frames (style=%s)", frame_num, video.caption_style)

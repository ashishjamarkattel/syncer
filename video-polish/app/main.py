import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, RedirectResponse
from openai import OpenAI

from app.config import settings
from app import storage as r2
from app.db import supabase, get_video, get_segments, set_status, fail_video
from app.models import Video
from app.pipeline.orchestrator import run_transcription_pipeline, run_render_pipeline, run_recaption_pipeline
from app.schemas import (
    ChatRequest, ChatResponse,
    RecaptionRequest,
    SegmentResponse, SegmentUpdate,
    VideoResponse, VideoStatusResponse, VideoUpdate,
)
from app.utils.ffmpeg import check_ffmpeg_available

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# voice_id → (display_name, preview_text)
VOICE_CATALOG: dict[str, tuple[str, str]] = {
    "alloy":   ("Drew",   "Hey! I'm Drew — casual, curious, and always up for something new. Let me narrate your story."),
    "echo":    ("Viraj",  "What's up! I'm Viraj. Energetic, confident, and ready to bring your video to life."),
    "nova":    ("Hope",   "Hello. I'm Hope — professional, clear, and focused on delivering your message with precision."),
    "fable":   ("Justin", "Hi there. I'm Justin. Relaxed, helpful, and here to make your content feel effortless."),
    "onyx":    ("Elon",   "Hey. I'm Elon — deep, natural, and ready to give your video a rich, authentic voice."),
    "shimmer": ("Chloe",  "Hi! I'm Chloe — lively, expressive, and excited to make your video shine."),
}


def _preview_path(voice_id: str) -> str:
    name = VOICE_CATALOG[voice_id][0]
    return os.path.join(settings.storage_dir, "_previews", f"{name}.wav")


def _generate_previews() -> None:
    preview_dir = os.path.join(settings.storage_dir, "_previews")
    os.makedirs(preview_dir, exist_ok=True)
    client = OpenAI(api_key=settings.openai_api_key)
    for voice_id, (name, text) in VOICE_CATALOG.items():
        path = _preview_path(voice_id)
        if not os.path.isfile(path):
            logger.info("[preview] generating %s.wav", name)
            resp = client.audio.speech.create(
                model=settings.tts_model,
                voice=voice_id,
                input=text,
                response_format="wav",
            )
            resp.stream_to_file(path)
        if settings.r2_enabled:
            r2.upload(path, f"_previews/{name}.wav")
    logger.info("[preview] all voice previews ready")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _generate_previews()
    yield


app = FastAPI(title="Video Polish API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

ACTIVE_STATUSES = {"transcribing", "cleaning", "generating_audio", "syncing", "rendering"}


@app.get("/health")
def health():
    if not check_ffmpeg_available():
        raise HTTPException(status_code=503, detail="FFmpeg not available on PATH")
    return {"status": "ok"}


# ── Video CRUD ──────────────────────────────────────────────────────────────

@app.get("/videos", response_model=list[VideoResponse])
def list_videos():
    resp = supabase.table("videos").select("*").order("created_at", desc=True).execute()
    return [VideoResponse.model_validate(row) for row in (resp.data or [])]


@app.post("/videos", response_model=VideoStatusResponse, status_code=201)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    voice: str = Form(default=None),
):
    video_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix.lstrip(".")
    if not ext:
        ext = "mp4"

    raw_dir = os.path.join(settings.storage_dir, video_id, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    source_path = os.path.join(raw_dir, f"source.{ext}")

    with open(source_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    if settings.r2_enabled:
        r2.upload(source_path, f"{video_id}/raw/source.{ext}")

    row = {
        "id": video_id,
        "filename": file.filename,
        "voice": voice or settings.default_voice,
        "status": "transcribing",
    }
    supabase.table("videos").insert(row).execute()
    background_tasks.add_task(run_transcription_pipeline, video_id, settings.storage_dir)
    logger.info("Uploaded video %s (%s) — transcription queued", video_id, file.filename)
    return {"id": video_id, "status": "transcribing"}


@app.get("/videos/{video_id}", response_model=VideoResponse)
def get_video_endpoint(video_id: str):
    video = _get_or_404(video_id)
    return VideoResponse.model_validate(vars(video))


@app.patch("/videos/{video_id}", response_model=VideoResponse)
def update_video(video_id: str, body: VideoUpdate):
    video = _get_or_404(video_id)
    updates: dict = {}
    if body.voice is not None:
        updates["voice"] = body.voice
    if body.caption_style is not None:
        from app.pipeline.captions import VALID_STYLES
        if body.caption_style not in VALID_STYLES and body.caption_style != "none":
            raise HTTPException(status_code=400, detail="Invalid caption style")
        updates["caption_style"] = None if body.caption_style == "none" else body.caption_style
    if updates:
        resp = supabase.table("videos").update(updates).eq("id", video_id).execute()
        return VideoResponse.model_validate(resp.data[0])
    return VideoResponse.model_validate(vars(video))


# ── Pipeline control ────────────────────────────────────────────────────────

@app.post("/videos/{video_id}/process", response_model=VideoStatusResponse)
def process_video(video_id: str, background_tasks: BackgroundTasks):
    video = _get_or_404(video_id)

    if video.status in {"transcribing", "cleaning"}:
        return {"id": video_id, "status": video.status}
    if video.status in {"generating_audio", "syncing", "rendering"}:
        raise HTTPException(status_code=409, detail=f"Video is already processing ({video.status})")
    if video.status == "transcribed":
        raise HTTPException(status_code=409, detail="Transcript ready — use /continue to generate video")
    if video.status == "completed":
        raise HTTPException(status_code=409, detail="Video already completed")

    if video.status == "failed":
        supabase.table("videos").update({"status": "uploaded", "error_message": None}).eq("id", video_id).execute()

    set_status(video_id, "transcribing")
    background_tasks.add_task(run_transcription_pipeline, video_id, settings.storage_dir)
    return {"id": video_id, "status": "transcribing"}


@app.post("/videos/{video_id}/continue", response_model=VideoStatusResponse)
def continue_video(video_id: str, background_tasks: BackgroundTasks):
    video = _get_or_404(video_id)

    if video.status in ACTIVE_STATUSES:
        raise HTTPException(status_code=409, detail=f"Already processing ({video.status})")
    if video.status == "completed":
        raise HTTPException(status_code=409, detail="Video already completed")
    if video.status not in ("transcribed", "failed"):
        raise HTTPException(
            status_code=409,
            detail=f"Video must be in 'transcribed' state, got: {video.status}",
        )

    supabase.table("videos").update({"status": "generating_audio", "error_message": None}).eq("id", video_id).execute()
    background_tasks.add_task(run_render_pipeline, video_id, settings.storage_dir)
    return {"id": video_id, "status": "generating_audio"}


# ── Segments ────────────────────────────────────────────────────────────────

@app.get("/videos/{video_id}/segments", response_model=list[SegmentResponse])
def get_segments_endpoint(video_id: str):
    _get_or_404(video_id)
    segments = get_segments(video_id)
    return [SegmentResponse.model_validate(vars(s)) for s in segments]


@app.put("/videos/{video_id}/segments/{seg_id}", response_model=SegmentResponse)
def update_segment(video_id: str, seg_id: int, body: SegmentUpdate):
    _get_or_404(video_id)
    resp = (
        supabase.table("segments")
        .update({"cleaned_text": body.cleaned_text})
        .eq("id", seg_id)
        .eq("video_id", video_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Segment not found")
    return SegmentResponse.model_validate(resp.data[0])


# ── AI chat editing ─────────────────────────────────────────────────────────

CHAT_SYSTEM = """\
You are a video transcript editor. The user gives you an instruction and the current transcript segments.
Apply the instruction to the relevant segments and return updated text.

Return ONLY valid JSON:
{
  "reply": "<short friendly message explaining what you changed, 1-2 sentences>",
  "segments": [{"id": <int>, "text": "<updated text>"}]
}

Include ALL segments in the output, even unchanged ones.
Keep changes minimal and targeted. Preserve the speaker's voice and style.
Never make a segment longer than 20 words unless explicitly asked.\
"""


@app.post("/videos/{video_id}/chat", response_model=ChatResponse)
async def chat_with_video(video_id: str, body: ChatRequest):
    video = _get_or_404(video_id)
    if video.status != "transcribed":
        raise HTTPException(status_code=409, detail="Chat editing only available while reviewing transcript")

    segments = get_segments(video_id)

    payload = {
        "instruction": body.message,
        "segments": [
            {"id": s.id, "index": s.index, "text": s.cleaned_text or s.original_text}
            for s in segments
        ],
    }

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model=settings.cleanup_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": CHAT_SYSTEM},
            {"role": "user", "content": json.dumps(payload)},
        ],
    )

    result = json.loads(response.choices[0].message.content)
    reply = result.get("reply", "Done!")
    updated_map = {item["id"]: item["text"] for item in result.get("segments", [])}

    for seg in segments:
        if seg.id in updated_map:
            supabase.table("segments").update({"cleaned_text": updated_map[seg.id]}).eq("id", seg.id).execute()

    fresh_segments = get_segments(video_id)
    return ChatResponse(
        reply=reply,
        segments=[SegmentResponse.model_validate(vars(s)) for s in fresh_segments],
    )


# ── Recaption ───────────────────────────────────────────────────────────────

@app.post("/videos/{video_id}/recaption", response_model=VideoStatusResponse)
def recaption_video(video_id: str, body: RecaptionRequest, background_tasks: BackgroundTasks):
    video = _get_or_404(video_id)
    if video.status != "completed":
        raise HTTPException(status_code=409, detail=f"Video must be completed, got: {video.status}")

    from app.pipeline.captions import VALID_STYLES
    if body.caption_style not in VALID_STYLES and body.caption_style != "none":
        raise HTTPException(status_code=400, detail="Invalid caption style")

    new_style = None if body.caption_style == "none" else body.caption_style
    supabase.table("videos").update({"caption_style": new_style, "status": "recaptioning"}).eq("id", video_id).execute()

    background_tasks.add_task(run_recaption_pipeline, video_id, settings.storage_dir)
    return {"id": video_id, "status": "recaptioning"}


# ── Voice previews ──────────────────────────────────────────────────────────

@app.get("/voices/{voice_id}/preview")
def get_voice_preview(voice_id: str):
    if voice_id not in VOICE_CATALOG:
        raise HTTPException(status_code=400, detail="Invalid voice")
    if settings.r2_enabled:
        name = VOICE_CATALOG[voice_id][0]
        return RedirectResponse(r2.public_url(f"_previews/{name}.wav"))
    path = _preview_path(voice_id)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Preview not found")
    return FileResponse(path, media_type="audio/wav")


# ── File serving ────────────────────────────────────────────────────────────

@app.get("/videos/{video_id}/source")
def get_source_video(video_id: str):
    _get_or_404(video_id)
    if settings.r2_enabled:
        raw_dir = os.path.join(settings.storage_dir, video_id, "raw")
        source_path = _find_source(raw_dir)
        ext = Path(source_path).suffix.lstrip(".") if source_path else "mp4"
        return RedirectResponse(r2.public_url(f"{video_id}/raw/source.{ext}"))
    raw_dir = os.path.join(settings.storage_dir, video_id, "raw")
    source_path = _find_source(raw_dir)
    if not source_path:
        raise HTTPException(status_code=404, detail="Source file not found")
    return FileResponse(source_path, media_type="video/mp4")


@app.get("/videos/{video_id}/download")
def download_video(video_id: str):
    video = _get_or_404(video_id)
    if video.status != "completed":
        raise HTTPException(status_code=404, detail=f"Video not ready ({video.status})")

    if settings.r2_enabled:
        return RedirectResponse(r2.public_url(f"{video_id}/output/polished.mp4"))

    output_path = os.path.join(settings.storage_dir, video_id, "output", "polished.mp4")
    if not os.path.isfile(output_path):
        raise HTTPException(status_code=404, detail="Output file not found")

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"polished_{video.filename}",
    )


@app.get("/videos/{video_id}/export/srt")
def export_srt(video_id: str):
    _get_or_404(video_id)
    segments = get_segments(video_id)
    if not segments:
        raise HTTPException(status_code=404, detail="No segments found")

    lines: list[str] = []
    for i, seg in enumerate(segments, 1):
        text = seg.cleaned_text or seg.original_text
        lines.append(str(i))
        lines.append(f"{_srt_time(seg.original_start)} --> {_srt_time(seg.original_end)}")
        lines.append(text)
        lines.append("")

    return PlainTextResponse("\n".join(lines), media_type="text/plain")


# ── Helpers ─────────────────────────────────────────────────────────────────

def _get_or_404(video_id: str) -> Video:
    video = get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


def _find_source(raw_dir: str) -> str | None:
    if not os.path.isdir(raw_dir):
        return None
    for name in os.listdir(raw_dir):
        if name.startswith("source."):
            return os.path.join(raw_dir, name)
    return None


def _srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

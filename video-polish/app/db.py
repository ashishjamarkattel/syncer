from supabase import create_client, Client

from app.config import settings

supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_video(video_id: str):
    from app.models import Video
    resp = supabase.table("videos").select("*").eq("id", video_id).maybe_single().execute()
    return Video.from_row(resp.data) if resp.data else None


def get_segments(video_id: str):
    from app.models import Segment
    resp = supabase.table("segments").select("*").eq("video_id", video_id).order("index").execute()
    return [Segment.from_row(r) for r in (resp.data or [])]


def set_status(video_id: str, status: str) -> None:
    supabase.table("videos").update({"status": status}).eq("id", video_id).execute()


def fail_video(video_id: str, message: str) -> None:
    supabase.table("videos").update({"status": "failed", "error_message": message}).eq("id", video_id).execute()

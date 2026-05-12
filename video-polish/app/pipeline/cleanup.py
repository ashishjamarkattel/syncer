import json
import logging

from openai import OpenAI

from app.config import settings
from app.db import supabase, get_segments
from app.models import Video

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are cleaning a screen recording transcript for AI voiceover regeneration.

For each segment, produce a cleaned version that:
- Removes filler words: um, uh, like, you know, basically, sort of, kind of
- Fixes false starts and self-corrections (e.g., "I want to — actually let me show you" becomes "Let me show you")
- Smooths grammar without changing meaning
- Preserves all proper nouns, product names, UI element names, and technical terms exactly as spoken
- Stays close to the original word count: cleaned version should be 70%–100% of the original word count, never longer
- Keeps the same sentence structure: one input segment produces exactly one output segment, in the same order
- Preserves deictic references (this, that, here, there, now)
- Keeps the speaker's tone — do not make casual speech corporate

Return ONLY valid JSON in this exact format:
{"segments": [{"id": <int>, "cleaned": "<string>"}, ...]}\
"""

BATCH_SIZE = 10


def cleanup(video: Video) -> None:
    logger.info("[cleanup] start video_id=%s", video.id)
    segments = get_segments(video.id)
    client = OpenAI(api_key=settings.openai_api_key)

    for batch_start in range(0, len(segments), BATCH_SIZE):
        batch = segments[batch_start: batch_start + BATCH_SIZE]
        payload = {"segments": [{"id": s.id, "text": s.original_text} for s in batch]}

        response = client.chat.completions.create(
            model=settings.cleanup_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
        )

        try:
            result = json.loads(response.choices[0].message.content)
            cleaned_map = {item["id"]: item["cleaned"] for item in result.get("segments", [])}
        except Exception as exc:
            logger.warning("[cleanup] failed to parse response for batch %d: %s", batch_start, exc)
            cleaned_map = {}

        for seg in batch:
            text = cleaned_map.get(seg.id)
            if text is None:
                logger.warning("[cleanup] segment %d missing from response, using original", seg.id)
                text = seg.original_text
            supabase.table("segments").update({"cleaned_text": text}).eq("id", seg.id).execute()

    logger.info("[cleanup] done, %d segments cleaned", len(segments))

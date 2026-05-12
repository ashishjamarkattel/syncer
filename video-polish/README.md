# Video Polish API

A FastAPI service that takes a raw screen recording and returns a polished version: original audio replaced with AI voiceover, silences cut, and everything kept in sync. Uses OpenAI Whisper for transcription, GPT-4o-mini for script cleanup, and OpenAI TTS for voice generation, with FFmpeg handling all video manipulation.

## Prerequisites

- Python 3.11+
- FFmpeg installed on the system:
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
```

## Run

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## API Usage

### Upload a video

```bash
curl -F "file=@demo.mp4" http://localhost:8000/videos
# {"id":"<video-id>","status":"uploaded"}
```

Optionally specify a voice (nova, alloy, echo, fable, onyx, shimmer):

```bash
curl -F "file=@demo.mp4" -F "voice=alloy" http://localhost:8000/videos
```

### Start processing

```bash
curl -X POST http://localhost:8000/videos/<video-id>/process
# {"id":"<video-id>","status":"transcribing"}
```

### Poll status

```bash
curl http://localhost:8000/videos/<video-id>
# {"id":"...","status":"completed","filename":"demo.mp4",...}
```

Statuses: `uploaded` → `transcribing` → `cleaning` → `generating_audio` → `syncing` → `rendering` → `completed` (or `failed`).

### View transcript segments

```bash
curl http://localhost:8000/videos/<video-id>/segments
```

Returns original and cleaned text for each segment.

### Download polished video

```bash
curl http://localhost:8000/videos/<video-id>/download -o polished.mp4
```

### Health check

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

## Storage layout

All files are stored locally under `./storage/<video-id>/`:

```
storage/<video-id>/
├── raw/source.{ext}        # Original upload
├── audio/extracted.wav     # Mono 16kHz audio for Whisper
├── tts/seg_N.wav           # TTS audio per segment
├── work/seg_N_*.mp4        # Intermediate per-segment files
└── output/polished.mp4     # Final result
```

## Running tests

```bash
pip install pytest
pytest tests/
```

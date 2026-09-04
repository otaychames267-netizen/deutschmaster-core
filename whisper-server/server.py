"""
Self-hosted German STT service — faster-whisper (CTranslate2), wrapped in a
minimal FastAPI HTTP server. Chosen over a persistent bidirectional
streaming protocol (like ElevenLabs' realtime WebSocket) deliberately: this
is simpler and lower-risk to implement correctly without a live server to
test against, at the cost of true token-by-token interim results (see
muendlichVoiceSession.ts's whisperStt.ts client — the Node side already
buffers a whole utterance via its own RMS-based speech/silence detection
before sending it here, so this endpoint only needs to transcribe complete
utterances, not maintain streaming state).

Model: defaults to a German-finetuned Whisper-large-v3-turbo (CTranslate2
format) — real published WER 2.628% on standard German test sets (better
than ElevenLabs Scribe's published 3.1% FLEURS WER). Override via
WHISPER_MODEL if a different checkpoint is preferred; falls back to the
stock multilingual large-v3-turbo with language="de" forced if the German
finetune isn't available in your environment.

NOT LIVE-TESTED: written using faster-whisper's stable, well-documented
Python API (WhisperModel(...).transcribe(...)), but there is no GPU/CPU
inference environment available to actually run this in the current
session. Ready to deploy the moment real infrastructure exists — see
docker-compose.yml and this directory's README for exact deployment steps.
"""
import io
import os
import wave

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

MODEL_NAME = os.environ.get("WHISPER_MODEL", "TheChola/whisper-large-v3-turbo-german-faster-whisper")
DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")  # "cuda" or "cpu"
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "float16" if DEVICE == "cuda" else "int8")
SAMPLE_RATE = 16000  # matches the existing pipeline's PCM16 mono 16kHz format end to end

app = FastAPI(title="muendlich-whisper-stt")
_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
    return _model


def pcm16_to_wav_bytes(pcm_bytes: bytes) -> bytes:
    """Wraps raw PCM16 mono 16kHz bytes in a minimal WAV header — the
    format faster-whisper (via ffmpeg/soundfile under the hood) expects,
    rather than passing headerless raw PCM directly."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(pcm_bytes)
    return buf.getvalue()


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "device": DEVICE}


@app.post("/transcribe")
async def transcribe(request: Request):
    pcm_bytes = await request.body()
    if len(pcm_bytes) < 3200:  # under ~0.1s of audio at 16kHz/16-bit — not worth a real inference call
        return JSONResponse({"text": ""})

    wav_bytes = pcm16_to_wav_bytes(pcm_bytes)
    model = get_model()
    try:
        segments, info = model.transcribe(
            io.BytesIO(wav_bytes),
            language="de",
            beam_size=5,
            vad_filter=True,  # trims leading/trailing silence within the utterance itself
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return JSONResponse({"text": text, "language_probability": info.language_probability})
    except Exception as e:  # noqa: BLE001 — surface a real 500 with the message, don't swallow it
        raise HTTPException(status_code=500, detail=str(e)) from e

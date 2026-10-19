# Self-hosted German STT service — see server.py's header for the full
# design rationale. Base image includes CUDA runtime libs for GPU inference;
# set WHISPER_DEVICE=cpu (and rebuild without this base, or just run on a
# CPU-only host — CTranslate2 runs fine on CPU, just slower) to run without
# a GPU, e.g. for small-scale/development use.
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY server.py .

# Model download happens on first request (WhisperModel(...) inside
# get_model()) unless pre-warmed — for production, consider baking the model
# weights into the image or a mounted volume to avoid a cold-start delay on
# the very first real transcription after a deploy/restart.
ENV WHISPER_MODEL=TheChola/whisper-large-v3-turbo-german-faster-whisper
ENV WHISPER_DEVICE=cuda
ENV WHISPER_COMPUTE_TYPE=float16

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]

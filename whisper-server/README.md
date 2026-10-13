# Self-hosted German STT (faster-whisper)

Replaces ElevenLabs Scribe for candidate speech-to-text — the dominant real
cost driver once student Teil-1 responses run 7,000-10,000 characters
(15-22 minutes of speech per exam room). See
`muendlich-relay/src/voice/finalCostModel.mjs` for the full cost
justification: at that duration, Google Cloud STT alone costs
~$14-17/participant/month (over budget by itself); this self-hosted service
costs ~$0.01/exam room (negligible).

German accuracy: the default model (`TheChola/whisper-large-v3-turbo-german-faster-whisper`,
a German-finetuned Whisper-large-v3-turbo in CTranslate2 format) publishes a
**2.628% WER** on standard German test sets — better than ElevenLabs
Scribe's published 3.1% FLEURS WER. Not independently re-verified here (no
GPU available in this session to run it against).

## Status: NOT LIVE-TESTED

Written using faster-whisper's stable, well-documented Python API. There is
no GPU/CPU inference environment in this session to actually run and verify
it. Ready to deploy and test the moment real infrastructure exists.

## Deploying

1. Provision a GPU host (RunPod, a cloud GPU VM, or any host with an NVIDIA
   GPU + the NVIDIA Container Toolkit). A single mid-tier GPU (e.g., an
   L4/L40S/A5000-class card) comfortably handles this workload at the
   volumes calculated in `finalCostModel.mjs` — see that file for the exact
   throughput assumption (35x realtime).
2. `docker compose up --build` in this directory.
3. Point `muendlich-relay`'s `WHISPER_STT_URL` env var at
   `http://<host>:8000` (see `../muendlich-relay/src/voice/whisperStt.ts`).
4. Run `npm run test:whisper-stt-live` from `muendlich-relay/` to verify —
   it's written to hit a real running server, not mocked.

## CPU-only fallback

For small-scale/development use without a GPU: set `WHISPER_DEVICE=cpu` and
`WHISPER_COMPUTE_TYPE=int8`, and remove the `deploy.resources` GPU block
from `docker-compose.yml`. Slower (real-time factor is worse on CPU than
GPU), but functional — faster-whisper's CTranslate2 backend runs on CPU by
design, this isn't a GPU-only library.

## Why HTTP, not a persistent streaming connection

ElevenLabs' realtime STT is a persistent WebSocket with true incremental
partial results. This service is a simple stateless `/transcribe` endpoint:
the Node-side client (`whisperStt.ts`) already buffers one candidate
utterance at a time using the SAME RMS-based speech/silence detection
`muendlichVoiceSession.ts` already has, and POSTs the complete utterance
once a pause is detected — mirroring the existing `onCommitted` callback
shape exactly, just without a separate `onPartial` interim-results signal.
This is a deliberate simplicity/risk tradeoff: a stateless HTTP endpoint is
far lower-risk to implement correctly without a live server to test
against than a hand-rolled streaming protocol against faster-whisper's
file-oriented `transcribe()` API. If real usage shows partial results are
needed (e.g., for a future live-transcript UI), migrating to a proper
streaming wrapper is a well-scoped follow-up, not a redesign.

# ISOLATED PROTOTYPE — not wired into production

Evaluates a decomposed Deepgram (STT) → Claude (examiner brain) → Cartesia
(TTS) voice pipeline as a possible replacement for `muendlich-relay`'s
integrated Gemini Live session, for a single TELC B2 Teil-1 (Präsentation)
exchange. **Nothing here is imported by, or affects, the production app or
`muendlich-relay/`.** No commits are proposed alongside this code.

Candidate-to-candidate audio (`src/lib/muendlich/useVoiceCall.ts` in the main
app) and the existing minute-based credit system (`muendlich_credits`) are
**not** part of this prototype and are untouched.

## Prerequisites

1. `cp .env.example .env`
2. Fill in `DEEPGRAM_API_KEY` and `CARTESIA_API_KEY` — neither exists
   anywhere else in this repo; you'll need to create accounts with each
   vendor and get your own keys.
3. Copy `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` from the repo root `.env`
   (both already exist there for other features — this prototype's `.env` is
   kept separate on purpose, for isolation).
4. `npm install`

Voice selection is automatic — `voicePool.ts` holds a pool of 8 German
(de-DE) voices confirmed live against your Cartesia account via
`npm run discover-voices` (4 masculine, 4 feminine). One voice is picked
randomly per session (`pickSessionVoice()`, called once at the top of each
`runOnce()`) and stays fixed for every examiner turn in that session — never
re-randomized turn-to-turn. The selected voice's ID/name/gender is recorded
in `out/<runId>-metrics.json` and printed to the console for reproducibility.
Re-run `npm run discover-voices` and update `voicePool.ts` by hand if your
account's voice library changes — never hand-type or guess IDs.

## First-run checklist (protocol details not yet smoke-tested)

`deepgramStt.ts` and `cartesiaTts.ts` are written against each vendor's
documented WebSocket protocol as of this session, but neither has been
smoke-tested against the real service (no API keys were available while
building this). On the first real run:

- If Deepgram rejects the connection or sends unexpected message shapes,
  check https://developers.deepgram.com/reference/speech-to-text/listen-streaming
  against the query params in `deepgramStt.ts`.
- If Cartesia rejects the connection, check the current `cartesia_version`
  date string and request/response field names against
  https://docs.cartesia.ai — `CARTESIA_VERSION` in `cartesiaTts.ts` may need
  bumping.
- `makeFixture.ts`'s Gemini TTS model name (`gemini-3.1-flash-tts-preview`)
  and response shape may also need adjusting if Gemini's TTS API has moved.

## Running

```bash
npm run make-fixture      # one-time: synthesizes fixtures/*.wav via Gemini TTS
npm run harness            # single run
npm run harness -- --runs=5       # reliability (report item 8)
npm run harness -- --interrupt    # interruption-quality (report item 7)
```

Each run writes `out/<runId>-reply.wav` (the synthesized examiner reply —
listen to this for subjective voice-quality judgment, item 6 of the report),
`out/<runId>-metrics.json`, and `out/<runId>-transcript.txt`.

## What this measures vs. what needs a human

Objectively measured by the harness itself: all latency numbers (STT/Claude/
Cartesia/end-to-end), Deepgram's confidence score, transcript-text accuracy
(diffable against the scripted input), Claude's reply content, and cost
(computed from real measured character/token counts × real vendor pricing).

Needs the user: actually listening to `out/<runId>-reply.wav` for subjective
naturalness/pronunciation/pacing judgment — that file will be sent directly
rather than a claimed assessment.

## Gemini Live baseline (report item 10)

A separate, comparable single-turn timing measurement against the existing
(untouched) `muendlich-relay` code, using the already-available
`GEMINI_API_KEY`, is run alongside this harness to give a real baseline —
see the top-level report, not a script in this directory (it reuses the
existing relay rather than duplicating it here).

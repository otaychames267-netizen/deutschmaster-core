# muendlich-relay

Standalone WebSocket relay bridging Room 2 student audio to a shared AI-examiner voice session. Runs as its own persistent process — deliberately **not** part of the main app, which deploys to Vercel serverless and cannot host a long-lived stateful connection.

## Voice backend: Gemini Live vs. Claude + ElevenLabs v3

Which AI actually runs the exam is controlled entirely by one env var, `MUENDLICH_VOICE_BACKEND` (see `voiceBackend.ts`):

- **`gemini`** (default) — the original, unchanged Gemini Live pipeline (`geminiLive.ts`): one integrated session handles listening, reasoning, and speaking together.
- **`elevenlabs`** — Claude Sonnet 5 (reasoning, via `voice/examinerBrain.ts`) + ElevenLabs Scribe v2 Realtime (listening, per-candidate) + ElevenLabs v3 (speaking) + a Voice Manager that assigns and persists a distinct examiner voice per exam session (`voice/`). See `voice/README.md` for the full architecture, what's live-verified vs. protocol-verified-from-docs-only, and the current external blocker (the ElevenLabs account this was built against is on the free tier, which the API itself explicitly rejects any TTS/STT use of the library voices on — nothing to do with this code).

Switching backends is a one-line env change and a redeploy — no code changes, and nothing about the exam's timing/state-machine/credit-deduction logic in `server.ts` changes either way.

## What's verified vs. what needs real human testing

**Verified against the real Supabase project and a real Gemini Live session (2026-07-08):**
- Auth (rejects invalid tokens, rejects non-participants of the room)
- Room pairing (waits for both participants, then opens one shared Gemini session)
- Room context correctly fetched (participant names, locked Teil 2/3 topics) and passed into the AI's system instructions
- Session lifecycle in the database (`muendlich_exam_sessions` row created on pairing, closed with the correct `end_reason` on disconnect)
- The underlying Gemini Live connection itself (separately, via `src/lib/muendlich/geminiLive.ts` in the main app) — real audio in, real audio out, correct dynamic welcome-by-name behavior

**NOT yet verified — genuinely cannot be, without two real people on real microphones:**
- Actual voice barge-in interruption behavior
- The 4-second anti-silence takeover timing feeling natural rather than jarring
- Audio quality/latency over a real network (this was tested on localhost)
- The "AI plays both examiner and partner" behavior on permanent disconnect — **not implemented yet**, only the 30-second reconnect grace window is
- Jitter buffering, crosstalk/audio-bleed defense — not implemented, need real network conditions to tune correctly rather than guessing thresholds

Do not treat this as "done" for real students until at least one real two-person test call has happened.

## Deploying to Fly.io

You need to do this part yourself — I can't provision cloud infrastructure or billing on your behalf.

```
cd muendlich-relay
fly auth login
fly launch --no-deploy   # creates the app; you can keep the generated name or edit fly.toml
fly secrets set \
  SUPABASE_URL=<same as main app's .env> \
  SUPABASE_ANON_KEY=<same as main app's VITE_SUPABASE_ANON_KEY> \
  SUPABASE_SERVICE_ROLE_KEY=<same as main app's .env> \
  GEMINI_API_KEY=<same as main app's .env>
fly deploy
```

To run the `elevenlabs` backend instead, also set:
```
fly secrets set \
  MUENDLICH_VOICE_BACKEND=elevenlabs \
  ANTHROPIC_API_KEY=<same as main app's .env> \
  ELEVENLABS_API_KEY=<a real key with voices_read + text_to_speech + speech_to_text permissions, on a paid plan — see voice/README.md>
```
(`GEMINI_API_KEY` can stay set even when unused — it's simply not read by this backend.)

Once deployed, the browser client connects to `wss://<your-app>.fly.dev/room/<roomId>?token=<the user's current Supabase access_token>`.

## Local development

```
cd muendlich-relay
npm install
cp .env.example .env   # fill in the same 4 secrets
npm run dev
```

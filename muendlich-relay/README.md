# muendlich-relay

Standalone WebSocket relay bridging Room 2 student audio to a shared Gemini Live session. Runs as its own persistent process — deliberately **not** part of the main app, which deploys to Vercel serverless and cannot host a long-lived stateful connection.

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

Once deployed, the browser client connects to `wss://<your-app>.fly.dev/room/<roomId>?token=<the user's current Supabase access_token>`.

## Local development

```
cd muendlich-relay
npm install
cp .env.example .env   # fill in the same 4 secrets
npm run dev
```

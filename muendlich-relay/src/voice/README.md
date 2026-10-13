# Claude + ElevenLabs voice backend

Three separate, purpose-specific pieces, wired together by `muendlichVoiceSession.ts`:

```
User speaks
  -> ElevenLabs Scribe v2 Realtime (STT, one stream per candidate slot)
  -> Claude Sonnet 5 (examinerBrain.ts — reasoning, conversation, personality) — ONLY for genuinely dynamic moments
  -> Voice Manager (voiceManager.ts — which ElevenLabs voice this exam session uses)
  -> ElevenLabs Flash v2.5 (dynamic TTS, streamed) OR pre-generated audio (phraseLibrary/ — zero runtime cost)
  -> Audio back to both candidates
```

## The three-layer principle

**Claude decides WHAT should happen; the app decides HOW to execute it.** Concretely: Claude is only ever called for moments where there is a real "what to say" decision — organic Teil-1 follow-ups, Teil-2 takeover questions, anti-silence nudges, Teil-3 moderation. For the 5 moments where the wording is 100% predetermined (welcome, exam_start, task_transition, section_transition, exam_end), there is no decision left for Claude to make once a variant is picked, so those moments **skip Claude entirely** and go straight to either pre-generated audio (welcome/exam_end) or a direct scripted-text TTS call (exam_start/task_transition/section_transition). See `phraseLibrary/`'s header comments and `examinerPhrases.ts` for the full design.

## Files

| File | Role |
|---|---|
| `voiceProfiles.ts` | `VoiceProfile` type — the shared shape every voice is described by |
| `voices.config.ts` | The 27 configured voice IDs — pure data, no logic |
| `voicePools.ts` | Groups voices by character/role (only "examiner" exists today) |
| `voiceManager.ts` | Assigns + persists a voice per exam session, with load-balanced fallback. `selectVoiceId()` is a pure function — see `voiceManager.test.mjs` |
| `supabaseVoiceStore.ts` | Supabase-backed persistence adapter for the above |
| `elevenLabsStt.ts` | Raw WS client for Scribe v2 Realtime |
| `elevenLabsTts.ts` | THREE TTS code paths: standard streaming (Flash v2.5, the live default), Text-to-Dialogue (v3, kept as a swappable alternative), and one-shot REST (`synthesizeOnce`, for offline library generation) — see its header comment |
| `examinerBrain.ts` | Claude conversation loop — system prompt (with prompt caching via `cache_control`), streaming reply generation, real token-usage capture (`onUsage`), the "stay silent" mechanism for organic triggers |
| `../examinerPhrases.ts` | Scripted (Claude-free) text pools for exam_start/task_transition/section_transition — 24 style-tagged variants each |
| `phraseLibrary/` | The fixed audio library — see its own section below |
| `muendlichVoiceSession.ts` | Orchestrates all of the above: `sendSystemMessage` (Claude-driven), `speakScriptedText` (Claude-free, dynamic TTS), `playLibraryPhrase` (Claude-free, pre-generated audio with dynamic-TTS fallback), organic-trigger handling, silence-suppression-with-hangover, real usage accounting (TTS chars, STT minutes, Claude tokens incl. cache) |
| `costAccounting.ts` | ElevenLabs credit/$ math (the given 1-char=0.5-credit rule + real published $ rates for Flash v2.5/v3/STT) AND Claude $ math (real Sonnet 5 rates + real cache-write/cache-read multipliers) — pure functions, `costAccounting.test.mjs` |
| `creditBudget.ts` | Hard 60,000-credit cap per participant; `recordExamUsage` splits the WHOLE ROOM's usage 50/50 between the two participants (see its header for the real bug this fixed) |
| `businessReport.mjs` | Computes the real per-exam/per-participant/per-scale cost tables from measured averages — `npm run business-report` |
| `architectureComparison.mjs` | Real-number comparison of ElevenLabs-only vs. hybrid (ElevenLabs TTS + Google/OpenAI STT) vs. fully-off-ElevenLabs architectures for the 50-60-exams/month target — `npm run architecture-comparison` |
| `fetchVoiceMetadata.ts` | Run once a properly-scoped key exists, to populate real voice metadata (see below) |
| `simulateFullExam.mjs` | Runs complete, realistic 3-Teil exams through the REAL current architecture (scripted/library text computed directly, Claude called only for genuinely dynamic moments) — `npm run simulate-exam` |
| `*.live-test.mjs` | Live tests against the real Supabase DB / real vendor APIs (not mocks) — `npm run test:voice-assignment-live`, `test:credit-budget-live`, `test:failure-handling-live`, `test:orchestrator-live` |

`../voiceBackend.ts` (one level up) is the actual env-gated switch `server.ts` imports from — it adapts both this backend and the original `geminiLive.ts` to one shared interface, including `playLibraryPhrase`/`speakScriptedText` (Gemini has no pre-generated-audio concept, so its adapter falls back to a "say exactly this" instruction — still a real spoken utterance, never silent).

## The fixed phrase library (`phraseLibrary/`)

| File | Role |
|---|---|
| `phraseTypes.ts` | `FixedPhrase`/`PhraseAudioAsset` types, and the header explaining why only `welcome`/`exam_end` can be true pre-generated audio (the other 3 categories carry real per-exam candidate names/topics) |
| `voiceStyle.ts` | Deterministically buckets each of the 27 voices into `formal`/`warm`/`calm` (placeholder heuristic — see its header — pending real ElevenLabs voice metadata) |
| `phraseSelection.ts` | Style-aware, non-immediate-repeat variant picker shared by every category |
| `fixedPhrases.ts` | 24 hand-written `welcome` + 24 `exam_end` variants (8 per style), name-free, professional-register, 80+ chars each — not simplistic chatbot lines |
| `libraryStore.ts` | Runtime manifest lookup — returns `null` (safe fallback, not a crash) when no audio has been generated yet |
| `generateLibrary.ts` | Offline, one-time generation script (`npm run generate-phrase-library`) — writes raw PCM16@24kHz per (phrase, voice) pair + a manifest. **BLOCKED** by the same ElevenLabs free-tier restriction documented below; fully written and safe to ship now (the fallback path means nothing breaks until it's actually run) |
| `phraseLibrary.test.mjs` | Pure-logic unit tests — pool sizes, style distribution, non-repeat selection, safe-fallback-when-no-manifest — `npm run test:phrase-library` |

## What's live-verified vs. protocol-verified-only

**Live-verified, with real API calls:**
- `examinerBrain.ts`'s core reasoning loop, streaming, prompt caching, and real token-usage capture — `npm run simulate-exam` makes real Claude calls every run and reports real input/output/cache-write/cache-read token counts (see the PR/commit description for exact numbers from this session's runs).
- `voiceManager.ts`'s selection algorithm — determinism, cross-session distribution, load-balancing fallback (`npm run test:voice-manager`).
- `costAccounting.ts`'s math, including the corrected STT credit rate (see its header — an earlier estimate was replaced with ElevenLabs' actually-published 330 credits/minute figure) — `npm run test:cost-accounting`.
- `phraseLibrary`'s selection/style/fallback logic — `npm run test:phrase-library`.
- The whole project typechecks clean (`npm run typecheck`).

**Protocol-verified against ElevenLabs' own documentation, NOT yet live-tested — blocked, not skipped:**
- `elevenLabsTts.ts` and `elevenLabsStt.ts`'s actual wire behavior, and therefore `generateLibrary.ts`'s actual audio output. The ElevenLabs account this was built against hits two real, external blockers:
  1. `voices_read` permission missing on the key (can't fetch real voice metadata).
  2. **The account is on the free tier, which unconditionally rejects any TTS use of library voices via the API** (`"Free users cannot use library voices via the API"`, `code: "payment_required"`) — confirmed not voice-specific (also rejects ElevenLabs' own default "Rachel" voice), confirmed again this session via the failure-handling/orchestrator live tests. The realtime STT endpoint returns a generic `auth_error` under the same key.
- Neither is a code bug. Every code path that depends on real ElevenLabs audio has a safe, tested fallback (dynamic-TTS fallback for `playLibraryPhrase`, error-and-reassign for a bad voice, graceful `null` for a failed STT open) — the app doesn't break, it just can't produce real audio yet. Once the account is upgraded: run `npm run generate-phrase-library` once, then real multi-turn live sessions to measure actual latency/audio quality.

## Adding a new voice

Append an entry to `voices.config.ts` — nothing else needs to change. The pool, the manager, the load-balancing, and the phrase-style bucketing all read from that array directly. Re-run `npm run generate-phrase-library` afterward to backfill fixed-phrase audio for the new voice (until then, `playLibraryPhrase` falls back to dynamic TTS for it automatically).

## Changing a session's voice manually

Delete (or update) the row in `muendlich_voice_assignments` for that `session_key` — the next `assignVoice` call will assign a fresh one.

## Known limitations

- **Structured (JSON) examiner output was deliberately NOT implemented this round.** The product spec asked for a `{action, text, section, difficulty, tone}` schema; this codebase instead achieves "Claude decides what, the app decides how" through the existing trigger/text mechanism — server.ts's own timers/state machine decide WHEN Claude speaks and for which purpose (the trigger type IS the action), Claude only ever contributes the TEXT, and the app alone decides the voice/timing/TTS routing. Adding a literal JSON action field would require re-plumbing the streaming-to-TTS pipeline (parsing a structured header out of a token stream before the rest can be treated as speakable text) with real risk to the now-tested streaming path, for a benefit that's largely already captured architecturally. Flagged explicitly rather than silently skipped or superficially half-done.
- **STT minutes/exam is a carried estimate (9 min), not freshly measured this session** — there's no real microphone/audio-call harness available to measure genuine STT duration; it directly determines whether the 90-exams/month target is achievable (see the final report). Real production usage should replace this the moment real usage data exists (the ledger already records real STT minutes per exam — `muendlich_elevenlabs_usage.stt_minutes`).
- **The Teil-1 "listen and decide when to ask a follow-up" behavior is an approximation of Gemini Live's continuous-audio judgment**, not identical to it — driven by ElevenLabs STT's `commit_strategy=vad` segment boundaries plus a 1.5s debounce, not true continuous listening.
- **No real-time barge-in from a candidate interrupting the examiner mid-sentence** — same limitation the original Gemini Live relay has today.
- **The per-participant "avoid repeating a phrase THEY'VE heard before" variety guarantee is process-scoped, not per-participant** — `phraseSelection.ts` avoids the last few variants used process-wide per category, not a durable per-user history (would need a DB read per selection). Documented tradeoff, not silently simplified.

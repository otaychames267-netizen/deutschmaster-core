# Mündlich Module — Phase 1 Architecture & Verification

TELC B2 oral-exam module. **No AI in Phase 1.** Every contract here is designed
to remain valid in Phase 2 (AI examiner) without redesign.

---

## 1. Vorbereitung (content management only)

Admins upload PDFs; students read them. No exercises, no OCR, no PDF analysis.

- **Tables:** `muendlich_materials` (`teil` 1–3, `category` ∈
  `themen | tipps | redemittel | repeated_questions`, `title`, `storage_path`, `sort_order`).
- **Storage:** private bucket `muendlich-pdfs`; auth users read via signed URL,
  admins write/delete (RLS).
- **Admin UI:** `/admin/muendlich` — upload (teil, category, title, file) and delete.
- **Student UI:** `/muendlich/vorbereitung/teil-{1,2,3}` → `VorbereitungMaterials`
  → `PdfViewer` (signed URL, zoom/fit, fullscreen, open-in-tab, Esc-close).
  Teil 1/2 categories: themen, tipps, redemittel. Teil 3 adds repeated_questions.

---

## 2. Prüfungssimulation (one continuous flow)

Route: `/muendlich/pruefung`. Source of truth = database, so **refresh = full recovery**.

### Room lifecycle (state machine — no skipped states)

```
waiting_for_partner → ready_check → preparation → exam_room_ready → (Phase 2: exam_in_progress → finished)
                                          │
                                          └─ at 00:00: selections lock + auto-advance
abandoned (terminal, on teardown)
```

### Data model

| Table | Purpose | Key constraints |
|---|---|---|
| `muendlich_rooms` | room + `code`, `state`, `prep_started_at`, `prep_seconds`(900) | `code` UNIQUE |
| `muendlich_participants` | A/B, connected/ready/mic_ok/voice_ok | UNIQUE(room,slot), UNIQUE(room,user) → **max 2** |
| `muendlich_selections` | Teil 1 per-slot, Teil 2/3 shared (slot null), `locked` | UNIQUE(room,teil,slot) |
| `muendlich_chat` | text chat | — |

### Real-time strategy (defense in depth)

- **Supabase Realtime** (`postgres_changes` on all 4 tables) for instant push.
- **2-second poll** fallback (`fetchRoomBundle`) so state/chat/timer/transition
  stay correct even if a browser blocks WebSocket realtime.

### Synchronized 15-minute timer (server-authoritative)

- `maybeStartPreparation` stamps `prep_started_at` with **server time**.
- Each client measures clock offset once via the `server_now()` RPC
  (`fetchServerOffsetMs` = serverNow − clientNow, RTT-corrected).
- `remainingSeconds(room, offsetMs, nowMs)` = `prep_seconds − (clientNow + offset − prep_started_at)`.
- Result: both clients show identical time **regardless of local clock skew**
  (verified correct under 75s artificial skew in the e2e test).

### Auto-lock + auto-transition

When the synchronized timer reaches 0, a single guarded call
(`lockAndAdvanceToExam`, fired-ref guard) sets all selections `locked=true` and
state → `exam_room_ready`; the 2s poll/realtime moves **both** clients into the
Exam Room with no manual action.

### Voice call (WebRTC P2P) — `useVoiceCall.ts`

- Signaling over Supabase broadcast channel `voice:<roomId>`.
- **Discovery:** hello / hello_ack handshake → connects regardless of join order.
- **Roles:** slot A impolite (makes offer), slot B polite (answers); perfect-negotiation
  collision handling.
- **ICE servers (this is the TURN work):**
  1. **STUN** (primary, fast): Google + Twilio.
  2. **TURN** (fallback relay for restrictive/symmetric-NAT/firewalled networks):
     - From env `VITE_TURN_URLS` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` if set
       (use your own TURN in production).
     - Otherwise OpenRelay public TURN (UDP 80, TCP/TLS 443) so voice works out-of-the-box.
  - `iceCandidatePoolSize: 4`; on ICE `failed`, impolite peer `restartIce()` →
    relayed path via TURN.
- Remote audio element mounted in DOM, autoplay + `.play()`.

> **Production note:** the OpenRelay public TURN is a convenience default with no
> SLA/bandwidth guarantee. For production, provision your own TURN (e.g. coturn or
> Twilio NTS) and set the three `VITE_TURN_*` env vars. STUN stays as the primary
> path either way.

---

## 3. Verification

### Automated (run by CI / `npx tsx scripts/muendlich-e2e.ts`)

Exercises the real room logic against the live DB, simulating A and B. **14/14 pass:**
same-room join, A/B assignment, max-2 (third rejected), preparation start with server
timestamp, server-driven timer identical under 75s skew, bidirectional chat, Teil 1
per-person / Teil 2-3 shared selections, timer→0, lock + auto-transition, refresh
recovery, **shared-selection no-duplicate**, **DB rejects duplicate shared (partial
unique index)**, **atomic prep-start (one concurrent winner)**, **atomic lock+advance
(one concurrent winner)**.

### Review fixes (post-implementation hardening)

A line-by-line review found and fixed these real defects (all now regression-tested):

1. **Shared-selection duplication (DB integrity).** `UNIQUE(room_id,teil,slot)` does not
   constrain NULL slots in Postgres, so Teil 2/3 re-picks inserted duplicate rows and
   upsert-on-conflict never matched. Fixed with a **partial unique index**
   `(room_id,teil) WHERE slot IS NULL` (migration `20260628000400`) + explicit
   update-or-insert in `saveSelection`.
2. **Timer desync on prep start.** Both clients could stamp `prep_started_at`. Made the
   transition **atomic** (`UPDATE … WHERE state='ready_check'`) so only one wins.
3. **Auto-transition race.** `lockAndAdvanceToExam` made **atomic**
   (`UPDATE … WHERE state='preparation'` returning rows) — only one caller processes.
4. **Join race.** Slot assignment now **retries** on a unique-violation (interleaving
   joins) and recovers the user's existing slot instead of failing the join.
5. **Accidental second room on refresh.** Recovery now shows a "Reconnecting…" loader
   while the bundle loads, instead of flashing the Landing page with Start/Join.
6. **Ghost participant.** `leave()` now marks the participant `connected=false` so the
   partner sees the disconnect.

### Final production audit (3rd pass)

7. **🔴 SECURITY — permissive RLS.** Room tables were `USING(true)` so any
   authenticated user could read every room's chat, tamper with any room's
   state/timer/selections, spoof participants, or delete any room. Replaced with
   **membership/ownership RLS** (migration `20260628000500`): act only within rooms
   you're a participant of; insert/modify only your own participant row; create rooms
   only as yourself; chat readable by members only and postable only as self. Verified:
   anon reads of chat return nothing and anon writes are blocked (`42501`).
8. **Voice didn't reconnect after refresh.** A fresh `hello` now resets `offerMade` so
   the impolite peer re-offers automatically.
9. **Cannot join a finished/abandoned room** — guard added in `joinOrCreateRoom`
   (regression-tested).
10. **Timer transition stall on transient error.** The `fired` guard now resets on
    failure so the lock+advance retries on the next tick.
11. **Stale generated types.** `types.ts` regenerated from the live schema (added
    `muendlich_*` and `sb_*` tables) → project now typechecks with **0 errors**
    (was 36). Fixed two surfaced nullability mismatches in Sprachbausteine Teil 1.
12. **Accessibility.** Added `aria-label`s to icon-only controls (mic toggle, copy
    Room ID, send/compose chat).

### Known limitations (by design for Phase 1)

- **Voice audio** requires real mics on two machines — only confirmable in the manual
  staging test. STUN+TURN configured (TURN fallback for symmetric NAT).
- **Room transition is client-driven:** if *both* clients disconnect exactly at 00:00,
  no one triggers the lock+advance (room stays in `preparation`). Phase 2 can add a
  server-side scheduler. Membership RLS is validated live in the staging acceptance test.
- Room `SELECT` is intentionally open (a joiner must look up a room by code); rows
  expose only code/state/timestamps, nothing private.

### Manual (final real-world acceptance — requires 2 users, 2 browsers, real mics)

The only items not machine-verifiable in a CLI sandbox (no mics, no second authenticated
session): **(a) WebRTC voice audio** ("both hear each other"), and **(b)** live UI
rendering / Realtime push delivery. Steps:

1. Two signed-in profiles → both open `/muendlich/pruefung`.
2. One **Start Prüfung**, copy Room ID; other **Join** with it → confirm A/B.
3. Both **Ready** → 15:00 countdown identical on both screens.
4. Speak → confirm both hear each other (voice). Type → confirm instant chat both ways.
5. Try a 3rd profile join → must be rejected.
6. Refresh each browser mid-prep → session/timer intact.
7. Let timer hit 00:00 → both auto-enter Exam Room.

Milestone is complete only after this manual pass succeeds.

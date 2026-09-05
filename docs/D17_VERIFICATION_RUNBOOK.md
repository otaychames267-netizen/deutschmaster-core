# D17 Payment Verification — Operations Runbook

This covers the D17/bank-transfer payment verification system: a temporary,
parallel payment path (alongside Lemon Squeezy) for Tunisian students paying
via D17 or bank transfer and uploading a screenshot as proof. It is designed
to be retired once a real D17 API/webhook exists — see "Future migration"
in the implementation plan for what changes vs. stays the same.

## v2 enterprise expansion (2026-07)

The original 8-phase build (below) was substantially hardened in a second
pass. Summary of what changed and why, for institutional memory:

- **Two required screenshots** — "Payment Success" and "Transaction
  History/Journal D17" — analyzed in a single combined Gemini call (cheaper
  against the shared daily budget than two separate calls, and lets the
  model reason about cross-consistency in-context). The rule engine
  independently re-derives consistency via direct field comparison
  (`cross_screenshot_consistency` check) rather than trusting the model's
  own `cross_check.consistent` self-report — same "AI is advisory, rule
  engine decides" discipline as every other check.
- **Order lifecycle hardening**: cryptographically random per-order session
  tokens (rejected on mismatch — reload the payment page to get a fresh
  one), a DB-enforced one-active-order-per-user partial unique index, 24h
  lazy expiry (checked at the two request paths that matter — no cron
  exists in this app), and the attempt cap raised from 3 to 5.
- **Destination verification**: the order snapshots `D17_OFFICIAL_NUMBER`/
  `D17_OFFICIAL_IBAN` at creation time; the rule engine's `destination_match`
  check compares the OCR'd destination against that snapshot, not the live
  env var — so a value changed after an order was created doesn't retroactively
  affect its own past attempts.
- **Escalating anti-fraud suspension**: a "confirmed duplicate" (any of six
  `DuplicateMatchType` variants — image hash, near-duplicate, OCR text,
  reference, Transaction ID, or Authorization Number reuse) escalates a
  per-user row in `d17_fraud_suspensions`: 1st → 1h suspension, 2nd → 24h,
  3rd+ → account locked pending admin review. Locked accounts have **no
  automatic unlock** by design — use the "Fraud / suspension status" panel
  on the order detail page (Clear suspension button). The historical
  `confirmed_duplicate_count` is never reset by clearing, only the active
  consequence.
- **Reputation & velocity signals**: capped ±10/±15 rule-engine inputs
  (prior clean approvals vs. prior confirmed duplicates; recent submission
  volume; device-fingerprint sharing across accounts) — deliberately
  low-influence, never a hard gate alone.
- **Fingerprinting is honestly weak, by design**: `device_fingerprint` is a
  `localStorage` UUID (`src/lib/d17/client-fingerprint.ts`), trivially reset
  by clearing browser storage. `browser_fingerprint` is a coarse hash of
  user-agent/language/timezone/screen-resolution — survives a storage
  clear, but is shared by every identical device/OS/browser combination, so
  it's far from unique. No canvas/WebGL fingerprinting library is installed
  (nor should one be added for a system explicitly described as temporary).
  `ip_address` — captured server-side from `x-forwarded-for`, not the
  dormant `session-tracking.ts` precedent's client-side ipify.org call — is
  the stronger, though still not unbeatable, signal. All three are
  capped-influence inputs to `velocity_signal`/reputation, never hard
  gates.
- **Provider Pattern (`src/lib/billing/payment-provider.ts`)**: an
  **additive facade only** — `LemonSqueezyProvider`/`D17ManualProvider` are
  thin wrappers around the existing, unchanged checkout/order logic;
  `D17ApiProvider` is a placeholder that throws "not yet available". The
  live billing page still calls `createCheckoutSession`/`createD17Order`
  directly — nothing in the live request path was rerouted. When the real
  D17 API/webhook arrives, only `D17ManualProvider` needs swapping for
  `D17ApiProvider`; no other part of the system (activation, unlocking,
  fraud detection, admin dashboard, reports, audit logs, UX) changes.
- **Explicitly NOT built**, with reasoning (all independently reviewed, not
  silently dropped): a literal async job queue ("designed for thousands of
  users") — this app has zero queue/Redis/cron infrastructure, so the
  pipeline stays a staged, individually-testable synchronous function
  instead of distributed job infra; scheduled encrypted backups — Supabase
  PITR is a paid dashboard toggle the project owner must enable themselves,
  not something application code can turn on; continuous 24/7 health
  monitoring — the existing reactive `alerting.server.ts` (fires on real
  failures during actual requests) was extended rather than building a
  polling daemon; cryptographic tamper-proof audit-log hash-chaining —
  app-level immutability (service-role-only writes, no UPDATE/DELETE
  policy) was judged proportionate for a system explicitly designed to be
  retired once the real D17 API exists.

## Emergency kill switch

**When to use it:** the Gemini API is down, returning errors, or producing
obviously wrong results (e.g. everything auto-rejecting or auto-approving).

**How:** Admin → Settings → "D17 Payment Verification" section → toggle
"Emergency kill switch" on. Every new screenshot submission is then routed
straight to manual review with zero Gemini calls — no code deploy needed,
takes effect immediately. Toggle it off once the issue is resolved.

Every flip is logged to `d17_alerts` (category `kill_switch_toggled`) with
the admin who did it, and pushed to Telegram if `TELEGRAM_BOT_TOKEN`/
`TELEGRAM_CHAT_ID` are configured.

## Manual subscription activation (bypass the pipeline entirely)

If an order is stuck or the whole verification pipeline needs bypassing for
a specific student:

1. Go to Admin → Payments, find the order (or search by student email),
   open its detail page (`/admin/d17/<orderId>`).
2. Click **Approve** to provision the plan's default allocation (300 min
   for Mündlich/Komplett, 30 essay credits for Schriftlich/Komplett), or use
   **Manually adjust grant** to specify a custom minutes/credits amount.
3. Both actions call the same `provision_muendlich_subscription` /
   `provision_essay_credits` RPCs the automated pipeline uses — hard-reset
   semantics (sets the balance, doesn't add to it) — and log an entry to
   `d17_admin_actions` with the admin's ID and an optional note.

If the order itself doesn't exist (e.g. a student paid but never got to
create one), you can also use the existing generic
`force-provision.functions.ts` override (Admin → Mündlich Minutes page) to
activate a subscription with no order at all.

## Where to find reports and logs

- **Admin → Payments** (`/admin/payments`): the live verification queue —
  every order with its status, risk score, AI confidence, and
  recommendation reason. Filter by status or search by student.
- **Order detail** (`/admin/d17/<orderId>`): full audit trail for one order
  — every attempt (OCR fields, fraud/duplicate signals, full rule-engine
  check-by-check breakdown, the actual screenshot), plus the admin action
  log for that order.
- **Admin → Reports** (`/admin/reports`): the "D17 Verification Report"
  card — date-ranged Auto Approved / Manual Review / Rejected / Duplicate /
  Fraud counts, average verification time, approval/rejection rates,
  cross-screenshot inconsistency count/rate (v2 — how often the two
  uploaded screenshots disagreed on amount/currency/date/destination), and
  currently-suspended/locked account counts (v2 — a live snapshot, not
  date-ranged), plus CSV export. The "D17 Reconciliation" card below it
  flags approved orders with a missing or mismatched subscription
  (internal-consistency only — there is no bank-statement feed in this app
  to check against real deposits).
- **`d17_alerts` table**: every Gemini failure, high-risk cluster (5+
  rejections/hour), budget-80%-warning, and kill-switch toggle, with
  whether the Telegram/email push actually succeeded. Query directly via
  `bun scripts/db-apply.mjs --query "select * from d17_alerts order by created_at desc limit 50;"`
  until an admin UI page is built for it.

## Handling repeated AI (Gemini) failures

1. Check `d17_alerts` for `category = 'gemini_failure'` rows to see how
   often/recently it's happening.
2. If Gemini itself appears down (check
   https://status.cloud.google.com or your own recent Gemini calls
   elsewhere in the app — essay grading, Mündlich Live), flip the kill
   switch (above) so new D17 submissions don't keep failing/costing budget
   attempting a broken call.
3. Every order that failed Gemini during the outage will have landed on
   `manual_review` automatically (the pipeline never blocks or errors out
   to the student on a Gemini failure) — clear the backlog manually via
   Admin → Payments once the AI is back, or leave the kill switch on and
   clear everything by hand if the outage is prolonged.
4. Turn the kill switch back off once Gemini is confirmed healthy again.

## Backups

This system has no separate backup mechanism — it's covered by whatever
backup policy is configured for the main Supabase project (Settings →
Database → Backups in the Supabase dashboard). One thing specific to this
feature: uploaded payment screenshots live in the `payment-screenshots`
storage bucket and are the audit-trail evidence for every decision — do not
add a lifecycle/expiry rule that deletes them while the system is active.

## Environment variables

All of these are safe to leave as placeholders — every piece of D17
functionality works with them unset, following this repo's "build ahead of
credentials" convention (same as Lemon Squeezy). See `.env.example` for the
full list and inline comments: `RESEND_API_KEY` / `RESEND_FROM_EMAIL`
(payment status + alert emails), `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`
(operational alerts), `ADMIN_ALERT_EMAIL` (optional extra alert
destination), `DHASH_DUPLICATE_THRESHOLD`, `D17_HOURLY_SUBMISSION_LIMIT`,
`VITE_SUPPORT_EMAIL`. `D17_OFFICIAL_NUMBER` / `D17_OFFICIAL_IBAN` (v2) are
the official D17 phone number/IBAN shown to students on the payment details
page — read server-side only and snapshotted onto each order at creation
time (so a later change never retroactively affects past orders' own
`destination_match` checks); unset shows a "not yet configured, contact
support" fallback on the payment page instead of blocking it.

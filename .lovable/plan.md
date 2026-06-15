# Lingovia Admin Panel — Foundation Plan

Goal: give you a complete admin workspace so you can manage exercises, audio, users, subscriptions, and analytics without code changes.

Existing admin routes already in the project:
`_authenticated.admin.tsx`, `admin.index`, `admin.users`, `admin.plans`, `admin.subscriptions`, `admin.messages`, `admin.analytics`. We'll keep them and add the missing pieces (content/questions, audio, backup) plus rebuild the existing ones around a real schema.

---

## 1. Database (new migration)

New tables in `public`:

- `exercises` — the core question bank
  - `level` (enum: `b1`, `b2`)
  - `module` (enum: `lesen`, `sprachbausteine`, `hoeren`, `schreiben`, `muendlich`)
  - `teil` (smallint 1–3)
  - `position` (smallint, ordering within teil)
  - `title`, `prompt` (the question/instruction text)
  - `passage` (long text, for Lesen)
  - `audio_id` (FK → `audio_assets.id`, nullable, for Hören)
  - `kind` (enum: `multiple_choice`, `true_false`, `matching`, `cloze`, `open_text`)
  - `options` (jsonb — answer choices)
  - `correct` (jsonb — solution(s))
  - `explanation` (text)
  - `status` (enum: `draft`, `published`, `hidden`)
  - `tags` (text[])

- `audio_assets`
  - `title`, `description`
  - `storage_path` (object key in `audio` bucket)
  - `duration_seconds`, `transcript`

- `user_exercise_attempts` — feeds Statistik + admin analytics
  - `user_id`, `exercise_id`, `score` (0–100), `is_correct`, `answer` (jsonb), `completed_at`

- `plans` already exists — we'll only add admin CRUD on top.
- `subscriptions` already exists — admin can edit `plan_code`, `status`, `expires_at`, toggle `is_trial`.

RLS:
- `exercises`, `audio_assets`: `SELECT` for `authenticated` when `status = 'published'`; full CRUD for admins via `has_role(auth.uid(),'admin')`.
- `user_exercise_attempts`: user can insert/select own rows; admins can select all.

Storage:
- New private bucket `audio`. Admins upload; authenticated users get signed URLs via a server fn.

## 2. Admin routes (rebuild + new)

```
/admin                       Overview cards + quick links
/admin/exercises             List + filters (level, module, teil, status, search)
/admin/exercises/new         Create
/admin/exercises/$id         Edit (incl. delete, publish/hide)
/admin/audio                 List + upload + edit + delete
/admin/users                 List, search, view detail, role toggle
/admin/users/$id             Subscription edit, activity, trial controls
/admin/plans                 CRUD on plans (price, features, active)
/admin/subscriptions         All subscriptions, filter by status/plan, edit
/admin/analytics             Stats dashboard (totals, actives, top exercises, avg score)
/admin/backup                Export / import JSON
```

All under existing `_authenticated.admin.tsx` gate (admin role required).

## 3. Server functions (`src/lib/admin/*.functions.ts`)

Each uses `requireSupabaseAuth` + an admin-role check before doing anything.

- `listExercises`, `getExercise`, `upsertExercise`, `deleteExercise`, `setExerciseStatus`
- `listAudio`, `createAudioAsset`, `deleteAudioAsset`, `getAudioSignedUrl`, `getAudioUploadUrl`
- `listUsers` (joins profiles + subscriptions + roles), `getUser`, `setUserRole`
- `listSubscriptions`, `updateSubscription`, `extendTrial`
- `listPlans`, `upsertPlan`, `togglePlanActive`
- `getAdminStats` — total users, active (30d), premium count, top 10 exercises by attempts, avg score, daily activity for last 30 days
- `exportBackup` — returns JSON dump of exercises + audio metadata + plans
- `importBackup` — accepts JSON, upserts rows (admin only, with confirmation)

User-facing wiring:
- Schriftlich/Mündlich "Teil" pages will fetch published exercises from the bank via a public server fn (`listPublishedExercises`) so the platform truly runs from the DB.
- Submitting an exercise records a `user_exercise_attempts` row → drives Statistik + Continue Learning.

## 4. UI

- Reuse shadcn `Table`, `Dialog`, `Form` (react-hook-form + zod), `Tabs`, `Select`.
- Exercise editor: structured form with dynamic options list, JSON-safe answer/correct fields, live preview panel showing how the question will render to a student.
- Audio manager: drag-drop upload to Storage (signed upload URL), inline player using signed playback URL.
- Backup: "Download JSON" button + drop-zone for import with diff summary before apply.

## 5. Out of scope (this phase)

- No new payment integration work — admin only edits existing `subscriptions` rows.
- Statistik student page already exists; admin analytics is separate.
- We will NOT migrate existing hard-coded Teil content in this phase; once you create exercises in the bank they'll show up on the student side. We can backfill in a follow-up.

---

## Build order

1. Migration (tables, enums, RLS, grants) + `audio` bucket.
2. Server fns + admin role guard helper.
3. `/admin/exercises` (list, create, edit, delete, publish).
4. `/admin/audio` (upload, list, delete).
5. `/admin/users`, `/admin/subscriptions`, `/admin/plans` rebuilt against real data.
6. `/admin/analytics` against `user_exercise_attempts` + `profiles` + `subscriptions`.
7. `/admin/backup` export/import.
8. Wire one student Teil page to read from the bank as a proof-of-concept.

This is a multi-step build; I'll ship it in the order above, pausing only if a decision is needed.

## Questions before I start

1. **Admin role**: are you already assigned the `admin` role in `user_roles`? If not, I'll add a migration that grants it to your account (I'll need your email).
2. **Backup scope**: export exercises + audio metadata + plans only, or also user data (profiles, subscriptions, attempts)? User data export has privacy implications.
3. **Backfill**: do you want me to seed the question bank with the current hard-coded Teil placeholders so the student pages stay populated, or start the bank empty?

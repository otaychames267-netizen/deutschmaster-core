# Phase 2 — TELC Exercise Engine

Goal: students can take database-driven exercises, get auto-corrected, see progress, and run timed exam simulations. Admins can later import PDF content into the question bank without code changes.

## 1. Exercise Runtime (student-facing)

New shared component `src/components/exercise/ExerciseRunner.tsx` that renders any `exercises` row by `kind`:
- `multiple_choice` — radio list, single correct
- `true_false` — two-option radio
- `matching` — left items ↔ right items (drag or select)
- `cloze` — passage with `___` gaps + inputs/dropdowns
- `open_text` — textarea (Schreiben Brief / open answers)

Each Teil route (`Lesen Teil 1/2/3`, `Sprachbausteine 1/2`, `Hören 1/2/3`, `Schreiben Brief`) becomes a thin wrapper that:
1. Calls a new server fn `listPublishedExercises({ level, module, teil })`.
2. Renders an `ExerciseSession` (list + current item navigator + submit button).
3. On submit, calls `submitAttempt({ exerciseId, answer })`.

Hören uses the existing `audio_assets` signed-URL flow (already built).

## 2. Automatic Correction

New server fn `submitAttempt` (auth-required) in `src/lib/exercises/attempts.functions.ts`:
- Loads the exercise (RLS scoped, published only).
- Grades by `kind`:
  - MC / TF: exact match against `correct[0]`.
  - Cloze: per-gap exact match, normalized (lowercase, trim, German umlaut variants), score = correct/total.
  - Matching: per-pair check, score = correct/total.
  - Open text: stored ungraded (`score = null`, `needs_review = true`) — admin can grade later from `/admin/attempts` (Phase 2.5).
- Inserts into `user_exercise_attempts` with `score`, `is_correct`, `answer`, `completed_at`, `duration_seconds`.
- Returns `{ correct, score, explanation, correctAnswer }` for instant feedback.

## 3. Student Progress Tracking

Update `/dashboard` and `/statistik`:
- Server fn `getMyProgress()` returns per-module completion %, attempts count, average score, current streak (consecutive days with ≥1 attempt), last 30-day activity.
- Dashboard widgets: Streak, Today's activity, Weekly accuracy, Module progress bars (Lesen/Sprachbausteine/Hören/Schreiben).
- `/statistik` page: full breakdown by Teil with sparkline + recent attempts table.

Streak/percentages auto-update because everything reads live from `user_exercise_attempts`.

## 4. Exam Mode (Prüfungssimulation)

New routes `/_authenticated/schriftlich/pruefung` and `/_authenticated/muendlich/pruefung` already exist as shells. Wire them up:

- New table `exam_sessions` (`user_id`, `level`, `mode` schriftlich|muendlich, `started_at`, `ends_at`, `submitted_at`, `score_total`, `score_breakdown` jsonb, `status` in_progress|submitted|expired).
- New server fn `startExam({ level, mode })`:
  - Picks a balanced set of published exercises per Teil (configurable counts matching TELC structure).
  - Returns session id + ordered exercise ids + total duration (e.g. B2 schriftlich = 190 min).
- `submitExamAnswer({ sessionId, exerciseId, answer })` — stores attempts linked to session, no instant feedback (`needs_review` open texts).
- `finishExam({ sessionId })` — locks session, computes per-module score, returns summary.
- Client: timer component (counts down, persists in `ends_at`, auto-submits on expiry), single-question-at-a-time UI, no back navigation to previous questions in strict mode (toggle).
- Results page: per-module score, accuracy, time used, open-text answers flagged for review.

## 5. PDF-to-Exercise Foundation (admin-only)

Add to `/admin/exercises` a new "Import from PDF" tab:
- Upload PDF → store in a new private `pdf_imports` bucket.
- Server fn `parsePdfImport({ storagePath })` uses `pdf-parse` (pure-JS, worker-compatible) to extract text.
- Heuristic splitter pre-fills a **review queue**: detect "Teil 1", numbered questions, A/B/C/D options, fill-in gaps.
- Admin sees a side-by-side editor: extracted candidates on left, editable `ExerciseEditor` form on right, "Publish" or "Discard" per item.
- Nothing auto-publishes — every imported exercise is a draft until the admin saves it.

This is the foundation only. No OCR for scanned PDFs in Phase 2 (note as Phase 3 follow-up).

## 6. Database Migration

Single migration:

```sql
-- exam sessions
CREATE TYPE exam_mode AS ENUM ('schriftlich','muendlich');
CREATE TYPE exam_status AS ENUM ('in_progress','submitted','expired');

CREATE TABLE public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level exercise_level NOT NULL,
  mode exam_mode NOT NULL,
  exercise_ids uuid[] NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  submitted_at timestamptz,
  score_total numeric,
  score_breakdown jsonb,
  status exam_status NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.exam_sessions TO authenticated;
GRANT ALL ON public.exam_sessions TO service_role;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam sessions" ON public.exam_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read all exam sessions" ON public.exam_sessions
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- link attempts to exam sessions + flag review
ALTER TABLE public.user_exercise_attempts
  ADD COLUMN exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE SET NULL,
  ADD COLUMN needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN duration_seconds integer;

-- pdf import staging
CREATE TABLE public.pdf_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  extracted_candidates jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_imports TO authenticated;
GRANT ALL ON public.pdf_imports TO service_role;
ALTER TABLE public.pdf_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage pdf imports" ON public.pdf_imports
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
```

Plus a `pdf_imports` private storage bucket.

## 7. Out of scope (deferred to Phase 3)
- AI grading of open-text Schreiben/Sprechen answers (Lovable AI).
- OCR for scanned PDFs.
- Certificate generation after exam pass.
- Leaderboards / social.

## File map

New:
- `src/components/exercise/ExerciseRunner.tsx`
- `src/components/exercise/ExerciseSession.tsx`
- `src/components/exercise/ExamTimer.tsx`
- `src/lib/exercises/exercises.functions.ts` (list/get published)
- `src/lib/exercises/attempts.functions.ts` (submit, grade)
- `src/lib/exercises/exam.functions.ts` (start/answer/finish)
- `src/lib/exercises/progress.functions.ts` (dashboard stats)
- `src/lib/exercises/grading.ts` (pure grading helpers)
- `src/lib/admin/pdf-import.functions.ts`
- `src/routes/_authenticated.admin.pdf-import.tsx`
- `src/routes/_authenticated.admin.attempts.tsx` (review open texts)

Edit:
- All Teil pages under `schriftlich/vorbereitung` + `muendlich/vorbereitung` → use `ExerciseSession`.
- `schriftlich.pruefung.tsx` + `muendlich.pruefung.tsx` → wire exam flow.
- `dashboard.tsx` + `statistik.tsx` → live progress widgets.
- `admin.tsx` nav → add "PDF Import" and "Open answers" tabs.

## Confirm before I start
1. **B2 schriftlich duration** — use standard TELC (Lesen 90' + Sprachbausteine 15' + Hören 30' + Schreiben 30' = 165' + break)? Or configurable per exam?
2. **Open-text grading** — manual admin review only for Phase 2 (AI grading deferred), correct?
3. **Exam strictness** — allow students to navigate back to previous questions, or strict one-way like real TELC?
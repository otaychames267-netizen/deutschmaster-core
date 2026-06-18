
# DeutschMaster Audit & Implementation Roadmap

This is a read-only audit of the current project plus a phased roadmap. No code is changed by this plan — approve it and I will execute Phase 1.

## 1. What I inspected

- Database schema and row counts (all 31 public tables).
- PDF import pipeline (`src/lib/admin/pdf-pipeline.functions.ts`, 1442 lines, with Gemini fallback already wired).
- Exercise data layer (`src/lib/exercises/*`).
- Student runner (`ExerciseRunner.tsx`, `ExerciseSession.tsx`).
- Student & admin routes under `src/routes/`.

## 2. Current state — what already works

**Database (solid foundation, do not redesign).**
- `exercises` — already keyed by `level / module / teil / position`, supports `kind` (multiple_choice, true_false, cloze, matching, open_text), `options` JSON, `passage`, `audio_id`, `status` (`draft|published`), `source_pdf_import_id`, `original_numbering`, `content_type` (`vorbereitung|pruefungssimulation`).
- `exercise_answer_keys` — separate table, versioned (`key_version`), linked to import. Correctly isolated from student-visible content.
- `exam_sessions` + `user_exercise_attempts` — full session model: timer (`ends_at`), `exercise_ids[]`, `score_total/breakdown`, per-attempt `is_correct`, `needs_review`, `key_version`.
- `pdf_imports`, `pdf_extractions`, `pdf_fidelity_reports` — full extraction + fidelity audit trail. A publish-guard trigger already blocks publishing without a passing fidelity report.
- RLS is in place on all student/admin tables.

**Student runner.**
- `ExerciseRunner` already handles MCQ, true/false, cloze, matching, open text — with the "Lösung anzeigen" gate (solutions hidden until the student clicks). This matches the spec.
- `ExerciseSession` already loads published exercises by `level/module/teil`, paginates, tracks done set, saves attempts.

**Exam mode.**
- `exam_sessions` + `_authenticated.exam.$id.tsx` + `_authenticated.pruefung.tsx` exist (timer + submit at end).

**PDF pipeline.**
- Lovable AI Gateway + Gemini fallback are working (verified previously).
- Chunked extraction, JSON repair, fidelity report.

## 3. What is broken or missing

**Content (the actual blocker).**
- `exercises`: 0 rows. `exercise_answer_keys`: 0 rows. `pdf_imports`: 1 row, status `extracted` — extraction ran but no exercises were ever materialised into the DB.
- Result: every student page shows "Noch keine Übungen veröffentlicht." The platform is empty even though extraction works.

**Pipeline gap (root cause of the emptiness).**
- The pipeline produces JSON candidates (`pdf_imports.extracted_candidates`) and a fidelity report, but the step that converts those candidates into rows in `exercises` + `exercise_answer_keys` either is not wired to the admin UI or never persists. Admins see raw JSON, not a publishable exam.
- No clean separation in the persistence step between: exam content (texts, questions, options, instructions, images) vs. answer keys vs. explanations.
- No skip rules enforced at persistence time for Themenliste / overview / WhatsApp / Telegram / translator notes / watermarks (the spec requires these to never enter the DB).

**Student experience gaps.**
- No two-mode toggle. The runner grades immediately on "Antwort prüfen"; there is no "Practice (instant feedback) vs Exam (feedback only at end)" switch surfaced to the student.
- No grouped "Reading Text → its questions 1–5" UI. `ExerciseSession` shows one exercise at a time, which breaks the Lesen Teil 2/3 experience where the same passage covers 5 questions.
- No final review screen listing all questions with student answer / correct answer / explanation after exam submit.
- No question navigator (jump to Q3, see which are unanswered) — only Prev/Next.

**Module coverage.**
- Lesen + Sprachbausteine: schema + runner ready; only missing content + grouping UI.
- Hören: `audio_assets` table + `audio` bucket exist; runner plays audio; missing audio ingestion in the admin import flow and a player tied to multi-question sets.
- Schreiben: `writing_topics` exists; `open_text` kind works; missing answer save + later-review UI; no AI grading yet (deferred).
- Mündlich: `speaking_topics` exists; no recording UI yet (explicitly deferred per spec).

**Admin import UX.**
- After extraction, admin sees JSON/extraction metadata rather than a "Review & Publish" view per exercise. The spec requires admins to never need to read JSON either.

## 4. Recommended development order

Build vertically (one module fully working) before going wide. Reading is the right first vertical: the schema, runner, and one example PDF are all closest to ready.

| Phase | Goal | Outcome for students |
|-------|------|----------------------|
| 1 | Persistence + Reading content live | Students can take a real Lesen exam end-to-end |
| 2 | Practice/Exam mode toggle + review screen | Two real modes, post-exam review with explanations |
| 3 | Sprachbausteine content | Second module live (same shape as Reading) |
| 4 | Hören (audio ingestion + grouped player) | Third module live |
| 5 | Schreiben save & review | Writing answers stored + reviewable |
| 6 | Mündlich tasks + (later) recording | Speaking prep available |
| 7 | Admin "Review & Publish" UI (no JSON) | Admins approve exercises in a human view |

## 5. Phase 1 — detailed (what I'd build first, on approval)

Goal: turn the existing extracted import into real, published Reading exercises a student can actually take.

1. **Materialiser server fn** (`src/lib/admin/materialize-exam.functions.ts`):
   - Reads `pdf_imports.extracted_candidates` + the fidelity report.
   - Filters out non-exam blocks (Themenliste, overview/title pages, WhatsApp/Telegram/Facebook/group names, translator notes, watermarks) by section heading + regex blocklist.
   - Inserts one `exercises` row per question, preserving `original_numbering`, exact `prompt`, exact `options`, exact `passage`. Groups questions that share a Reading text by storing the same `passage` and consecutive `position` values (Teil-level grouping is implicit via `level/module/teil`).
   - Inserts matching `exercise_answer_keys` rows from the answer-key candidates (separate table, never embedded in the student-visible row).
   - Stays `status='draft'` until admin clicks Publish; publish trigger already enforces a passing fidelity report.

2. **Reading grouping in the runner**:
   - Update `ExerciseSession` so when consecutive exercises in a Teil share the same `passage`, they render as one screen: passage on the left, questions 1..n on the right. Submit per question keeps working; navigation moves to the next group.

3. **Practice vs Exam mode prop**:
   - `ExerciseSession` already supports `hideFeedback` via `ExerciseRunner`. Add a `mode: "practice" | "exam"` prop, wire `hideFeedback=true` for exam mode, store all answers locally, only call `submitAttempt` + reveal results at the end.

4. **Validation**: run the importer against the existing extracted PDF, confirm exercises appear under `/_authenticated/practice/b1/lesen/1..5`, verify "Lösung anzeigen" still gates explanations.

## 6. Technical notes

- No schema changes are needed for Phase 1 — every column required (passage, options, correct via `exercise_answer_keys`, original_numbering, position) already exists.
- The Gemini fallback already in place keeps Phase 1 reproducible without Lovable credits.
- All new server fns will use `requireSupabaseAuth` + `has_role('super_admin')` for write paths.
- Student-facing pages stay public-to-authenticated under `_authenticated/`; no anon access added.

## 7. What I will NOT do without further approval

- No redesign of the DB schema.
- No rewrite of the extraction pipeline (it works; only the persistence step is missing).
- No automatic deletion of the existing `pdf_imports` row.
- No new pricing/billing/admin pages.

Approve and I will execute Phase 1.

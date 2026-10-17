# Strict free Schreiben grader

Goal (owner 2026-10-17): grade telc Schreiben essays **strictly and for free** — Anthropic and DeepInfra were at $0 for days and a free model that scores directly is far too generous.

## Idea
1. **Observe** – a free LLM fills an *observation sheet* (content points covered, form, register, connector/sub-clause counts, quoted errors). It never gives a score. (`extract.mjs`, prompt = `sheetPrompt` in `src/lib/grading/strict-free/strict-free-grader.server.ts`; the two must stay identical — the calibrator is fitted on that wording.)
2. **Verify** – every quoted error must occur in the essay (`verifyErrors`).
3. **Score** – ridge regression (`ridge.ts`, weights in `calibration.json`) fitted on the 271 essays Claude Sonnet 5 graded, + hard examiner rules (`rules.ts`).
4. **Explain** – a free LLM writes German feedback + Arabic correction cards from the verified errors with the scores fixed in the prompt; deterministic fallback text if it fails.

Wired in `src/lib/grading/essay-grader.ts`: Claude → strict free grader → generic DeepInfra/Groq backup (last resort, too generous). Disable with `STRICT_FREE_GRADER=off`.

## Results (271 Claude-graded essays, 10-fold CV grouped by task so no task is in train and test)
| grader | total MAE (of 45) | bias | pass/fail (27) agreement |
|---|---|---|---|
| free model scoring directly with the strict Claude prompt (gemini-3.5-flash-lite, 45 essays) | 6.49 | **+5.29** | – |
| **strict free grader** (observer gemini-3.1-flash-lite) | **2.55** | −0.15 | **94 %** |

Ablation: the style/content features carry most of the signal; spell-checker features did not help (dropped). Non-linear terms gain < 0.1 point (not used).

## Re-fitting
```
node ../revoice/db.mjs @export-gradings.sql > claude-gradings.json        # (any way to run the SQL)
node extract.mjs gemini-3.1-flash-lite 0 999 2                              # free-tier, resumable → obs/<model>/<id>.json
bun run fit-export.ts --gradings claude-gradings.json --obs obs/gemini-3.1-flash-lite --rules   # CV report + writes calibration.json
```
Free-tier limits (this project's Google key, 2026-10-17): gemini-3.1-flash-lite 15/min, gemini-3.5-flash-lite ~12/min, gemini-3.8-flash 5/min, gemini-2.5-flash-lite **20 per day**, Gemma-4 30/min but HTTP 500 often. The pool in `providers.server.ts` hops to the next model on 429/5xx.
Privacy note: Google's free tier may use prompts to improve its products — set `STRICT_FREE_OBSERVERS` / `STRICT_FREE_WRITERS` to `groq:…` models only if that matters.

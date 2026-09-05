# Lesen Teil 3 — Production Report (CLOSED)

Status: **Production-ready — milestone closed 2026-07-04.**
Source of truth: official TELC PDFs (`Desktop/TELC PDFS LESEN/Lesen Teil 3 (1).pdf`
and `Teil_3_schnelle_Wasserfahrzeuge_*.pdf`).

## Final state

| Metric | Result |
|---|---|
| Total exercises (teil=3) | 38 |
| Situations each | 10 (numbers 11–20) |
| Ad texts each | 12 (A–L); n21 "Berlin" = 10 (only 10 ads in source) |
| Situations with a valid key | 380 / 380 (no missing keys) |
| Garbled situation text | 0 |
| Answer keys verified vs printed PDF key pages | all |
| Server-scored 10/10 via `score_lesen_t3` RPC | 38 / 38 |

Answers are scored **server-side** (`public.score_lesen_t3(p_exercise_id, p_answers)`);
`correct_letter`/`no_match` are never sent to the client. In the UI, "no match" (X)
is submitted as `'0'`.

## Work performed (session 2026-07-03/04)

1. **n38 "schnelle Wasserfahrzeuge"** — the old n38 was a Frankenstein (garbled
   situations + ads from a different apartments/furniture exercise). Fully replaced
   from the official PDF images: 10 clean situations, 12 ads, key **LKXIACFBEX**.
   Every situation→ad mapping verified against ad content.
2. **n22–n37 (16 exercises)** — situation TEXT was corrupted by two-column
   `pdftotext` merge during the earlier rebuild. Re-transcribed all 160 situations
   from the page images and updated **only** `lesen_t3_situations.description`.
   Keys and ads were left untouched (already verified).
3. **Answer-key verification** — read the printed PDF key pages directly:
   - p76 → `KEXACHFJBG` (n17, n18, incl. "معدل" variant)
   - p109 → `KEXACHFJBG` (n27)
   - p82 → `LIBHXEADFX` (n19, n20)
   - p142 → `XBDKGFLIXJ` (n35, n36)
   The compilation reuses identical keys across related reading sets — not errors.
4. **E2E** — student login + full UI run on n38 (10/10 "Perfekt!"), a negative test
   proving scoring discriminates, and the authenticated RPC across all 38 → all 10/10.

## Official variants preserved (do NOT merge/delete)

Distinct "معدل" (modified) variant pairs/sets kept: n17/n18, n19/n20, n22/n23,
n24/n25, n32/n33/n34, n35/n36.

## Documented source-PDF defects (flagged, NOT invented — for manual decision)

- **n38, ad G**: heading/body-start clipped at the source PDF's page break. It is a
  distractor (letter G is not in key LKXIACFBEX), so the exercise is fully solvable.
  Stored as a labeled fragment.
- **n36, situation 19**: the source variant contains an unfinished editing
  placeholder (`"…Vorträge* … *andere Verb*"`). Maps to **X (no-match)**, so wording
  does not affect scoring. Stored as a clean readable form.

## Tooling (in `scripts/`)

- `t3-import-wasserfahrzeuge.mjs` — rebuilds n38 from the images (idempotent, `--apply`).
- `t3-fix-situations.mjs` — repairs n22–n37 situation text (updates description only, `--apply`).
- `t3-rebuild.mjs`, `t3-apply.mjs`, `t3-keymap.mjs`, `t3-rekey.mjs`, `t3-parse.mjs`,
  `t3-structure.mjs`, `t3-sits.mjs` — the original rebuild/analysis pipeline.

## Reopen policy

Teil 3 is **closed**. Do not run a full rebuild / full E2E / full re-validation
unless a real, specific defect is found — then fix and validate only the affected
exercise(s).

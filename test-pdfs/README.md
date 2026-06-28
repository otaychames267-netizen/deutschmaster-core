# PDF Import Regression Test Suite

Drop TELC B2 exam PDFs into the matching subfolder, then run:

```
npm run test:import
```

## Folder layout

```
test-pdfs/
  lesen-t1/   — PDFs that contain a Lesen Teil 1 section
  lesen-t2/   — PDFs that contain a Lesen Teil 2 section
  lesen-t3/   — PDFs that contain a Lesen Teil 3 section
  reports/    — Auto-generated Markdown reports (one per run)
```

A PDF may appear in **multiple** folders if it contains multiple sections. The runner treats each subfolder independently and tests only the relevant parser.

## What the runner checks

For every PDF it runs the full pipeline:

1. **Stage 1** — `extractNormalizedDocument()`: pages, lines, scanned detection, column layout, duplicate-block detection
2. **Stage 2** — section parser: structure counts, answer detection, confidence score

A test **PASSES** when it meets the minimum thresholds:

| Section    | Minimum                                                             |
|------------|---------------------------------------------------------------------|
| lesen-t1   | ≥ 7 headlines, ≥ 4 texts, ≥ 4 answers                              |
| lesen-t2   | ≥ 50-word passage, ≥ 3 questions, ≥ 1 answer (if not "single" block) |
| lesen-t3   | ≥ 7 situations, ≥ 8 ad texts, ≥ 5 answers                          |

## Adding a new PDF

Just copy the file. No config needed — the runner discovers everything automatically.

## Policy

- PDF files are **not committed** to git (`.gitignore` excludes `*.pdf` in this folder)
- Reports are also excluded — they are local artifacts
- Thresholds are in `scripts/test-import.ts` → `THRESHOLDS`
- **Do not patch a parser for a single PDF.** If a PDF fails, identify which pipeline stage is responsible and fix the root cause so all parsers benefit

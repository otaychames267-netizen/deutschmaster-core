# Sprachbausteine Teil 2 — PENDING

**RESOLVED (2026-07-06): both previously-pending pages have been re-investigated and imported.
Nothing remains pending. All 41 PDF pages are now represented in the DB (41 exercises).**

## Page 29: "Deutschland – ein Paradies für Kinder?" (VERSION 2) — RESOLVED, imported as position 40
Re-investigated with additional 900dpi crops. Confirmed genuine finding: word box has TWO
duplicate-word pairs — D/H both "DENNOCH" (D highlighted = answer for gap 34, H unhighlighted
= distractor) and N/I both "DOCH" (N highlighted = answer for gap 35, I unhighlighted =
distractor). Since the passage and full 10/10 answer key are completely intact (this is a
distractor-duplication print artifact, not missing content), it was imported faithfully rather
than skipped, using `sb-t2-insert.mjs --allow-dup-words` (new flag added for this confirmed,
documented case only). Word-box entries "NIMANDEN"/"SONDER" corrected to NIEMANDEN/SONDERN
(single-letter OCR-type drop, not a grammar guess). See `backups/sb-t2/sbt2-ex40.json`.

## Page 34: "Garten in der Stadt" — RESOLVED, imported as position 41
Re-investigated per user instruction (2026-07-06): import verbatim, fix only obvious
OCR/spelling mistakes, do not invent/reconstruct missing text, keep the ending exactly as it
exists in the source. The full 10/10 answer key was confirmed unambiguous (all letters a-o
numbered/highlighted). The passage prose itself remains genuinely garbled (broken word order,
missing connectives) — preserved verbatim except for single-word typo fixes (Trand→Trend,
Blümen→Blumen, schützwälle→Schutzwälle, belibte→beliebte, Aspalt→Asphalt, ligt→liegt,
pasychologischen→psychologischen, städchen→Städtchen, trefpunkten→Treffpunkten,
MITLERWEILE→MITTLERWEILE). Two tokens ("gerabenig", "veruneinigen") could not be confidently
mapped to a single word and were left completely uncorrected. The passage ends exactly where
the source ends (nothing follows gap 40), matching the source's own Arabic annotation admitting
the ending (gaps 39-40) is textually incomplete in the official material itself. See
`backups/sb-t2/sbt2-ex41.json` and its `notes` field for full detail.

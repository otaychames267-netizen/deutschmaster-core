# Sprachbausteine final consistency pass (2026-08-29)

Ran after completing the T1 (100%) + T2 (100%) explanation-deepening
batches, per the standing "final full consistency/quality pass over
everything" requirement.

## Checks run (all via live DB queries, not file inspection)

1. Null-content check (both Teils): 0 exercises with `learning_aids IS NULL`.
2. First-pass-distractor heuristic (`explanation_correct = explanation_wrong`
   for every gap): 0 exercises remaining in either Teil.
3. Gap-count completeness: 0 exercises with an item count != 10.
4. Required-field completeness (`item_type`, `evidence_text`,
   `explanation_wrong`, `explanation_correct` all non-null, and every
   `evidence_text` contains a `**bold**` marker): 0 violations.
5. T2 keyword/answer-key cross-check (bolded word in `evidence_text` vs.
   `sb_t2_gaps.correct_word`, case/ß-insensitive substring match):
   3 hits, 1 false positive (AUSSERDEM/Außerdem — orthographic ss/ß
   variant only, no fix needed), 2 genuine spelling typos:
   - "ADRIAN" gap 35: word bank + correct_word had "GEEIGENET" instead
     of "GEEIGNET" — fixed in both `sb_t2_words` and `sb_t2_gaps`.
   - "Herr Blanco Ruiz" gap 33: word bank + correct_word had "KENIE"
     instead of "KEINE" — fixed in both tables.
   Both typos were internally self-consistent (word bank and answer key
   shared the same misspelling), so they weren't breaking grading, but
   presenting a misspelled German word to B2 students as a valid answer
   choice was a real content-quality defect. `learning_aids.keyword`
   text for both gaps already used the correct spelling, so no
   `learning_aids` edit was needed beyond the two table fixes.

No equivalent T1 cross-check was run this pass (T1 uses per-gap a/b/c
option tables rather than a shared word bank; its keyword/evidence
mismatches were already hunted down individually during the T1 batches
— see memory `project-sb-explanation-deepening.md`).

## Outcome

Sprachbausteine Teil 1 (73/73) and Teil 2 (77/77) are both at 100%:
every gap has genuine, individually-reasoned Arabic explanation_wrong
content, correct item_type, and a verified-correct answer key (2 real
answer-key bugs found and fixed this pass, on top of the ~10 found
during the batch passes themselves).

-- B2 Sprachbausteine Teil 2 — source-defect fixes (owner: "if you are 100% sure, fix them"). Each statement is guarded by the current text, so it is a no-op if the data differs.
-- Backup of the pre-fix rows: scripts/learning-aids/_backup_sb_t2_source_fixes_before.json

-- [4] Ausbildung mit über 30, gap 38: "kürzer vor ___ stehen" → "kürzer zur ___ stehen" (zur Verfügung stehen).
update sb_t2_passages set passage = replace(passage, 'kürzer vor {{38}} stehen', 'kürzer zur {{38}} stehen')
 where exercise_id = '74d4c34f-cd23-479c-92d2-fc2997228133' and passage like '%kürzer vor {{38}} stehen%';

-- [60] Es gibt immer weniger Deutsche, gap 39: "…Rentenversicherungen ___ in den Konsum stecken müssen" → STATT (key was IM).
update sb_t2_gaps set correct_word = 'STATT'
 where exercise_id = '073775f3-00fa-43f3-8bee-e23893a1f936' and gap_number = 39 and correct_word = 'IM';

-- [63] Sprachwandel: gap 31 "frustrierend: ___!" → "frustrierend ___!" (… zugleich!); gap 35 missing separable "an" at the end of the sentence; "Sprache … zur Verfügung stehen" → "steht".
update sb_t2_passages set passage = replace(replace(replace(passage,
        'simpel und frustrierend: {{31}}!', 'simpel und frustrierend {{31}}!'),
        'dieses sogenannte Social-Media-Deutsch."', 'dieses sogenannte Social-Media-Deutsch an."'),
        'Sprache {{39}} Verfügung stehen', 'Sprache {{39}} Verfügung steht')
 where exercise_id = '8f1948c2-1155-4f24-a5de-4c7f8a5aa90b';

-- [64] Hobby und Charakter, gap 36: "eignen sich ___ Aktivitäten" needs the inflected form → word list entry SOZIAL → SOZIALE (+ key).
update sb_t2_words set word = 'SOZIALE'
 where exercise_id = 'b3c07c0d-e3de-4abe-b582-bffdc02eea5f' and word = 'SOZIAL';
update sb_t2_gaps set correct_word = 'SOZIALE'
 where exercise_id = 'b3c07c0d-e3de-4abe-b582-bffdc02eea5f' and gap_number = 36 and correct_word = 'SOZIAL';

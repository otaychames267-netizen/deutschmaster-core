-- B2 Sprachbausteine Teil 1 — PROPOSED answer-key fixes. NOT EXECUTED: these change exam answer data, so they wait for the owner's approval.
-- Found while writing the new explanations (2026-10-05). Every statement is guarded by the current option text, so it is a no-op if the data differs.
-- Backup of the original [5]/[6] rows: scripts/learning-aids/_backup_sb_t1_gap21_swap.json. Run, then apply scripts/learning-aids/sb1_batch15_afterfix.mjs
-- (node scripts/learning-aids/sb-t1-apply.mjs scripts/learning-aids/sb1_batch15_afterfix.mjs --apply) to finish the last 8 exercises.
-- [58] gap 21 ("Anlässlich" vs "zwecks") is NOT in this file: the sentence looks truncated ("Anlässlich [des Tages für] mehr Internetsicherheit"?) — check the source first.

-- [5] Herr Martini (Original), gap 21: sentence "zu der Studienreise ___ Schulklasse" needs "Ihrer" (its options were an | von | zu — the options of [6]).
update sb_t1_gaps set option_a = 'Seiner', option_b = 'Deiner', option_c = 'Ihrer', correct = 'c'
 where gap_number = 21 and option_c = 'zu'
   and exercise_id = (select id from sb_exercises where teil = 1 and level = 'TELC_B2' and position = 5);

-- [6] Herr Martini (معدل), gap 21: sentence "Anfrage vom 16. Juni ___ der Studienreise" needs "zu" (its options were Seiner | Deiner | Ihrer).
update sb_t1_gaps set option_a = 'an', option_b = 'von', option_c = 'zu', correct = 'c'
 where gap_number = 21 and option_c = 'Ihrer'
   and exercise_id = (select id from sb_exercises where teil = 1 and level = 'TELC_B2' and position = 6);

-- [17] Frau Szabo (Original), gap 23: "___ besserer Einschätzung" (Genitiv) → "Zwecks" (key was "Für").
update sb_t1_gaps set correct = 'c'
 where gap_number = 23 and option_c = 'Zwecks'
   and exercise_id = (select id from sb_exercises where teil = 1 and level = 'TELC_B2' and position = 17);

-- [33] Lina, gap 26: "durch ___ Stellenbörsen" (Akk. Plural, no article) → "verschiedene" (key was "verschiedenen").
update sb_t1_gaps set correct = 'a'
 where gap_number = 26 and option_a = 'verschiedene'
   and exercise_id = (select id from sb_exercises where teil = 1 and level = 'TELC_B2' and position = 33);

-- [34] + [35] Liebe Sandra (Original / معدل), gap 27: "wild ___ Tiere" (Akk. Plural, no article) → "lebende" (key was "lebenden").
update sb_t1_gaps set correct = 'a'
 where gap_number = 27 and option_a = 'lebende'
   and exercise_id in (select id from sb_exercises where teil = 1 and level = 'TELC_B2' and position in (34, 35));

-- [46] Jens' Fußballtrainer-Sorgen, gap 29: "in einem ___ Chaos" (Dativ neutrum after ein-Wort) → "totalen" (key was "totalem").
update sb_t1_gaps set correct = 'b'
 where gap_number = 29 and option_b = 'totalen'
   and exercise_id = (select id from sb_exercises where teil = 1 and level = 'TELC_B2' and position = 46);

-- [49] Frau Stein (Neu), gap 30: "Wir rechnen ___, dass …" (rechnen mit) → "damit" (key was "dabei").
update sb_t1_gaps set correct = 'b'
 where gap_number = 30 and option_b = 'damit'
   and exercise_id = (select id from sb_exercises where teil = 1 and level = 'TELC_B2' and position = 49);

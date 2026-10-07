UPDATE lesen_t3_situations s SET description = CASE s.number
    WHEN 11 THEN 'Sie möchten einen Tag verbringen und sich dabei bewegen.'
    WHEN 13 THEN 'Ihr Sohn möchte eine Feier und braucht Hilfe.' END
  FROM lesen_exercises e
  WHERE s.exercise_id = e.id AND e.title = 'Ausflug (معدل)' AND e.level = 'TELC_B2' AND e.teil = 3 AND s.number IN (11, 13);
UPDATE lesen_exercises SET import_notes = replace(import_notes,
    'Der Wortlaut der Quelle ist bewusst unverändert (er enthält offensichtliche Tippfehler: "ein Tag machen", "Freier" statt "Feier"); Korrektur wartet auf Freigabe.',
    'Zwei offensichtliche Tippfehler der Quelle wurden mit Freigabe des Nutzers (2026-10-07) korrigiert: Situation 11 "ein Tag machen" -> "einen Tag verbringen", Situation 13 "Freier" -> "Feier".')
  WHERE title = 'Ausflug (معدل)' AND level = 'TELC_B2' AND teil = 3;

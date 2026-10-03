-- Hören Teil 3 migration from zertify.app (2nd old-platform migration source)
-- Re-audited via content-based (not title-based) duplicate check against the full existing
-- Teil 3 DB before finalizing. 3 of the original 12 candidates were caught as exact-content
-- duplicates hiding under different titles and excluded:
--   "Radio Konzert" = existing "Beim Klassik-Radio" (identical statements)
--   "Sie hören den Anrufbeantworter" = existing "Buchhandlung" (identical statements)
--   "Nach Einer Großdemonstration" = existing "Wanderung" (identical statements)
-- Two of the 9 kept below are legitimate reworded/polarity-flipped variants of existing
-- exercises (same pattern as the already-established Ausgang-26/Carina/Mallorca variant
-- families), not duplicates:
--   "In Raum C23 (المعدل)" vs existing "In Raum C23" — statement 5 flips polarity
--   "Süddeutschland" vs existing "Süden Deutschlands Schnee" — reworded, one statement flipped
-- All titles preserved exactly as on zertify.app, no invented/renamed titles.

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('In Raum C23 (المعدل)', 3, 'TELC_B2', 999, 'Imported from zertify.app; polarity-flipped variant of existing "In Raum C23"')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'In Raum C23 trägt ein bekannter Schriftlicher etwas vor.', false),
  (2, 'Wenn ihre Software nicht funktioniert, erhalten Sie über Internet Unterstützung.', true),
  (3, 'In der Stadtbibliothek präsentiert heute eine Hochschule ihr Angebot vor allem für Berufstätige.', false),
  (4, 'Im Internet finden Sie auch Angebot für spezielle Zielgruppen.', false),
  (5, 'Wenn man jemandem persönlich sprechen möchte, braucht man keinen Termin.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Trainingsausfahrten', 3, 'TELC_B2', 999, 'Imported from zertify.app')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Trainingsausfahrten mit dem Rennvelo samstags empfehlen sich nur für besonders geübte Radfahrer.', false),
  (2, 'Auf dem Blumenmarkt in Groningen kann man auch Gartenzubehör kaufen.', true),
  (3, 'In der Zooschule wird Unterricht nicht nur für Schüler, sondern auch für Rentner erteilt.', false),
  (4, 'Ein Markt wird Ende Juli für Kinder bis 16 Jahre in Stuttgart veranstaltet, wo sie ihre alten Bücher und Spielzeuge verkaufen können.', true),
  (5, 'Auf der A94 zwischen München und Burghausen muss man langsam fahren, weil sich auf der Straße Gegenstände befinden.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Open-Air-Kino', 3, 'TELC_B2', 999, 'Imported from zertify.app')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Das Open-Air-Kino zeigt im Juli an jedem Wochentag einen Film.', false),
  (2, 'Zum Flughafen muss man am Westkreuz in einen Bus umsteigen.', true),
  (3, 'In akuten Notfällen soll man zur Vertretungspraxis gehen.', false),
  (4, 'Die Abgabe von Bücherspenden ist nur von Montag bis Freitag möglich.', false),
  (5, 'Auf der A8 ist vor allem abends mit Stau zu rechnen.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Aktionstag', 3, 'TELC_B2', 999, 'Imported from zertify.app')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Interessierte können beim Aktionstag Aufgaben unverbindlich ausprobieren.', true),
  (2, 'Die Akrobatik-Vorführung fällt wegen des starken Windes komplett aus.', false),
  (3, 'In dem Beitrag wird vor der Nutzung von Passwort-Managern gewarnt.', false),
  (4, 'Besuchern wird empfohlen, ihr Auto am Nordeingang des Parks abzustellen.', false),
  (5, 'Für das Probetraining im Box-Club muss man sich vorher anmelden.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Klavierkonzert', 3, 'TELC_B2', 999, 'Imported from zertify.app')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Festivalbesucher erhalten beim Vorzeigen ihres Tickets Rabatt auf Bus und Bahn.', false),
  (2, 'Das Klavierkonzert am 3. Juli findet wegen einer Erkrankung der Künstler nicht statt.', false),
  (3, 'Im Botanischen Garten gibt es am Sonntag Tipps zur Pflege von Obstbäumen.', true),
  (4, 'Die Sonderausstellung im Museum zeigt historische Arbeitskleidung aus Leder.', false),
  (5, 'Die A6 ist zwischen Baden-Baden und Rastatt in beide Richtungen gesperrt.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Süddeutschland', 3, 'TELC_B2', 999, 'Imported from zertify.app; reworded/polarity-flipped variant of existing "Süden Deutschlands Schnee"')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Morgen wird in Süddeutschland mit Neuschnee gerechnet.', true),
  (2, 'Die Polizei sucht Kinder, die von zu Hause geflohen sind.', false),
  (3, 'Samstags gibt es bei der Firma telefonische Beratung.', false),
  (4, 'Besucher können problemlos mit dem Auto in die Altstadt fahren.', false),
  (5, 'Die historische Bahn fährt im Dezember nach Plan.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Zugverkehr', 3, 'TELC_B2', 999, 'Imported from zertify.app')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Der Zugverkehr nach Westend ist aufgrund von Personalmangel unterbrochen.', false),
  (2, 'Kursanmeldungen sind trotz geschlossener Anmeldezentrale online möglich.', true),
  (3, 'Die neuen Parkausweise sind ab sofort ausschließlich digital verfügbar.', false),
  (4, 'Das Museum bietet am Wochenende freien Eintritt für alle Altersgruppen.', false),
  (5, 'Die Verpflegung der Freiwilligen wird vom Veranstalter übernommen.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Musikfest', 3, 'TELC_B2', 999, 'Imported from zertify.app')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Das Musikfest wendet sich vornehmlich an Berufsmusiker.', false),
  (2, '„MoveSmart“ unterstützt umweltschonende Verkehrsentscheidungen.', true),
  (3, 'Die Sendung „Zeitzeugen erzählen“ nutzt ausschließlich Interviews aus den 80er-Jahren.', false),
  (4, '„Jobwechsel 40+“ ist speziell für Berufseinsteiger konzipiert.', false),
  (5, 'Das Zentrum ermöglicht Besuchern eigenständige Experimente.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Akrobatik-Show Im Park', 3, 'TELC_B2', 999, 'Imported from zertify.app')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Interessierte können am Aktionstag die ehrenamtliche Arbeit direkt austesten.', true),
  (2, 'Die geplante Akrobatik-Show im Park muss dieses Jahr entfallen.', false),
  (3, 'Nutzer werden vor einer neuen Methode zum Datendiebstahl gewarnt.', true),
  (4, 'Die Besucher sollten für die Anreise zum Festival das Rad nutzen.', true),
  (5, 'Für die Teilnahme am Schnuppertraining ist eine Voranmeldung nötig.', false)
) AS v(n, txt, correct);

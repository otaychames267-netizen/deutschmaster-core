-- Migrates 10 Hören Teil 2 exercises from the user's own prior platform
-- (zertify.app) into AuraLingovia, using each exercise's exact original
-- title (no renaming). Answer keys verified empirically via the source
-- site's post-submission reveal ("الصحيح هو: ..."), cross-checked against
-- this project's own existing "Mallorca" exercise (identical text,
-- identical key: statements 3/4/7 correct) before trusting the method.
--
-- Re-audit corrections (2026-07-26, per user review):
-- - "Mallorca (الأساسي)" = existing "Mallorca" (identical text/key) — excluded.
-- - "Mallorca-Urlaub (المعدل)" = existing "Mallorca 2" (identical text/key) — excluded.
-- - "Mallorca (Neu)" is a genuinely distinct, unrelated story (Coolcationing/
--   Dr. Weber) — imported under its exact original title.
-- - "Obst und Gemüse" is word-for-word identical to the existing "Bio-Obst"
--   exercise — removed from this migration entirely (do not duplicate).
-- - "Carina (المعدل 2)" is a genuinely distinct 3rd Carina variant, textually
--   different from both existing "Carina" and "Carina 2" — added.

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Herr Böhm', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Amerikanische Politiker haben die Entscheidung für das Projekt getroffen.', false),
  (2, 'Herr Böhm wollte schon als Kind Bauingenieur werden.', false),
  (3, 'Das älteste Bauwerk ist 80.000 Jahre alt.', false),
  (4, 'Herr Böhm arbeitet häufig an ähnlichen Projekten.', false),
  (5, 'Moderne Maschinen erhöhen die Sicherheit auf Baustellen.', true),
  (6, 'Früher mussten Bauarbeiter viele gefährliche Aufgaben selbst übernehmen.', true),
  (7, 'Herr Böhm arbeitete früher im Bereich Maschinenentwicklung.', true),
  (8, 'Am Anfang gab es finanzielle Probleme bei dem Projekt.', true),
  (9, 'Automatische Kontrollsysteme helfen dabei, Gefahren früher zu erkennen.', true),
  (10, 'Das Projekt wird heute durch europäische Fördermittel unterstützt.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Matteo', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Matteos erstes Restaurant schloss wegen eines Küchenbrands.', false),
  (2, 'Matteo wuchs hauptsächlich bei seinem Onkel auf dem Land auf.', true),
  (3, 'Auf dem Bauernhof gab es keine anderen Kinder außer Matteo.', false),
  (4, 'Die Ausbildung war für Matteo psychisch sehr belastend.', true),
  (5, 'Bei Bewerbern achtet Matteo zuerst auf gute Noten und Diplome.', false),
  (6, 'Der Geschmack des Essens ist Matteo wichtiger als das Aussehen.', true),
  (7, 'Seine Kochschule ist in erster Linie für Erwachsene gedacht.', true),
  (8, 'Matteo lehnt Fertiggerichte und Fast Food komplett ab.', false),
  (9, 'Matteo findet TV-Kochshows eine absolute Zeitverschwendung.', false),
  (10, 'Privat kocht Matteo am liebsten ganz einfache Mahlzeiten.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Mallorca (Neu)', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Distinct, unrelated story from this project''s existing "Mallorca"/"Mallorca 2" exercises despite the shared title word — verified by full-text comparison. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Mallorca ist als Reiseziel laut Dr. Weber am Ende.', false),
  (2, '„Coolcationing” ist Urlaub in kühleren Gebieten.', true),
  (3, 'Nordeuropa-Reisenden ist ein günstiger Preis sehr wichtig.', false),
  (4, 'In Schweden wird das Jedermannsrecht oft missbraucht.', true),
  (5, 'Albaniens Tourismus-Infrastruktur wurde schnell modernisiert.', true),
  (6, 'Das Baltikum zieht Touristen durch viele Golfplätze an.', false),
  (7, 'Laut Dr. Weber sind Visum-Regeln das Hauptproblem bei Ost-Reisen.', false),
  (8, 'Reisen in den Osten scheitern oft an schlechten Verbindungen.', true),
  (9, 'Senioren bevorzugen heute vor allem gemütliche Urlaube.', false),
  (10, '„Best-Ager” buchen immer öfter schwierige Fernwanderungen.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Janis', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Janis findet, dass Autoren heute von Kritikern ignoriert werden.', false),
  (2, 'Das Setting seines Romans basiert auf einer Weltreise.', false),
  (3, 'Sein Biologie-Studium hilft ihm beim Entwurf der Monster.', true),
  (4, 'Janis schreibt seine ersten Entwürfe handschriftlich.', false),
  (5, 'Der Autor korrigiert niemals während des ersten Schreibens.', true),
  (6, 'Janis findet den Plot wichtiger als die Charaktere.', false),
  (7, 'Früher versuchte Janis, Erfolg durch Trends zu kopieren.', true),
  (8, 'Der Verlag hat das Buchende gegen seinen Willen geändert.', false),
  (9, 'Janis braucht Stille und Einsamkeit zum Schreiben.', false),
  (10, 'Er rät jungen Autoren, soziale Medien nicht zu wichtig zu nehmen.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Journalisten - Weber', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Weber ist heute vor Auftritten gar nicht mehr nervös.', false),
  (2, 'Im Studium ist Weber die Praxis besonders wichtig.', true),
  (3, 'Weber dreht in seiner Freizeit gerne eigene Filme.', false),
  (4, 'Journalisten müssen heute multimedial arbeiten können.', true),
  (5, 'Sportjournalist ist heute kein realistischer Berufswunsch.', false),
  (6, 'Ein guter Journalist braucht Entdeckergeist.', true),
  (7, 'Ein Unfall beendete Webers Karriere als Handballer.', true),
  (8, 'Weber sammelte erst nach dem Studium Berufserfahrung.', false),
  (9, 'Journalisten sollten gegenüber Stars neutral bleiben.', true),
  (10, 'Weber rät nach dem Abitur zu Praktika in Redaktionen.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Lukas', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Lukas war nach dem Schulabschluss zunächst unentschlossen.', true),
  (2, 'Die Lehrer halfen dem Gastschüler bei Sprachproblemen kaum.', true),
  (3, 'Spanien ist als Au-Pair-Land aktuell wenig gefragt.', false),
  (4, 'Lukas dachte auch über einen Aufenthalt in Italien nach.', true),
  (5, 'Früher schickte man Au-Pairs vor allem zur Arbeit nach England.', false),
  (6, 'Lukas rät dazu, unbedingt einen Vertrag abzuschließen.', true),
  (7, 'Lukas kritisiert die hohen Kosten der Vermittlungsagenturen.', false),
  (8, 'Lukas fühlte sich anfangs nicht als Teil der Familie.', true),
  (9, 'Die Reise nach Madrid stärkte den Zusammenhalt mit der Familie.', true),
  (10, 'Lukas lernte Spanisch hauptsächlich im Sprachkurs.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Dr. Lenz', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Frau Dr. Lenz spricht aus ihrem ruhigen Büro.', false),
  (2, 'Das Projekt „Lern-Zukunft” läuft erst seit wenigen Wochen.', false),
  (3, 'Es gibt für die Schüler keine Anwesenheitspflicht.', false),
  (4, 'Feedbackgespräche ersetzen die klassischen Schulnoten.', true),
  (5, 'Lehrer halten weiterhin überwiegend Frontalunterricht.', false),
  (6, 'Alle Eltern befürworteten das Konzept von Anfang an.', false),
  (7, 'Die Schule wurde rein aus Staatsmitteln finanziert.', false),
  (8, 'Das Interesse am Schulmodell hat zugenommen.', true),
  (9, 'Das Konzept verlangt viel Selbstorganisation.', true),
  (10, 'Frau Dr. Lenz blickt trotz Stress positiv in die Zukunft.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Frau Seidel', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Frau Seidel erledigt ihre Arbeit überwiegend am Schreibtisch.', false),
  (2, 'Die Bauarbeiten fallen in eine stark frequentierte Zeit.', true),
  (3, 'Die aktuellen Probleme betreffen ausschließlich den Regionalverkehr.', false),
  (4, 'Der Ersatzverkehr erfolgt ausschließlich mit Bussen.', false),
  (5, 'Geschäftsreisende bleiben von den Störungen weitgehend unbeeinträchtigt.', false),
  (6, 'Einschränkungen wirken sich nicht auf alle Freizeitangebote gleichermaßen aus.', true),
  (7, 'Man erwartet eine vollständige Rückkehr zum Normalbetrieb.', false),
  (8, 'Die Situation ist im Vergleich zum letzten Wochenende deutlich entspannter.', false),
  (9, 'Vergleichbare Situationen traten früher nie während der Ferien auf.', false),
  (10, 'Trotz der Belastung ist Frau Seidel mit ihrer Arbeit zufrieden.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Carina (المعدل 2)', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Third distinct Carina variant on the source site — textually different from this project''s existing "Carina" and "Carina 2" (different statements/facts, same character/topic), confirmed via full-text comparison before import. Source statements 1/2/8/10 have non-standard/broken German grammar as printed on the source site — preserved verbatim, not corrected, per this project''s established transcription policy. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Carina Traumt Davon Filmspiel in Holandy.', false),
  (2, 'Carina steht ihr Beruf an erste Stelle.', false),
  (3, 'Carina hat sich der Agentur mit einem Film präsentiert.', false),
  (4, 'Carina musste für einen Film ihr Gewicht stark verändern.', false),
  (5, 'Carina macht lieber gefühlvolle Filme als Action-Filme.', false),
  (6, 'Wegen der vielen Fehlstunden hatte Carina Probleme mit dem Direktor der Schule.', false),
  (7, 'Carinas Eltern haben ihre Tochter von Anfang an unterstützt.', false),
  (8, 'Carina findet den Wechsel zwischen Schule und Drehterminen nicht immer Problemlos.', true),
  (9, 'Bei Dialogen darf man auch selbst etwas erfinden.', true),
  (10, 'Corina würde keine Filmspiel spielen.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Jonas', 2, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-26. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Zu Studienbeginn hatte Jonas keinerlei Gründungsabsichten.', true),
  (2, 'Der Impuls für das Projekt entstand in einem obligatorischen Seminar.', true),
  (3, 'Jonas startete ohne anfängliche finanzielle Hilfe.', true),
  (4, 'Die Maschinennutzung war für Jonas nicht kostenpflichtig.', true),
  (5, 'Die Lieferauflagen der Stadtwerke zwangen Jonas zur Studienpause.', true),
  (6, 'Beide Elternteile begrüßten seine Studienpause gleichermaßen.', false),
  (7, 'Die Anfangshalle bot äußerst schlechte Arbeitsbedingungen.', true),
  (8, 'Jonas'' aktuelles Einkommen liegt unter den verbreiteten Erwartungen.', true),
  (9, 'Sein Unternehmen recycelt inzwischen auch Textilabfälle.', false),
  (10, 'Jonas möchte junge Initiativen durch Schulungen unterstützen.', true)
) AS v(n, txt, correct);

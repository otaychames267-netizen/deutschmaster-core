-- Migrates 16 Hören Teil 1 exercises from the user's own prior platform
-- (zertify.app) into AuraLingovia, using each exercise's exact original
-- title (no renaming). Answer keys verified empirically via the source
-- site's post-submission reveal ("الصحيح هو: ..."), which fires even with
-- zero items answered (confirmed methodology from the Teil 2 migration,
-- 20260726010000).
--
-- Content-based duplicate check (distinctive-phrase search across all
-- existing Teil 1 statements, not just titles) excluded 2 candidates:
-- - "Berufen" is word-for-word identical to the existing "Vier Tage pro"
--   (same 5 statements, same key) — excluded.
-- - "Unwetterschäden" is word-for-word identical to the existing "Wetter"
--   (same 5 statements, same key) — excluded.
-- "Bürger" and "Softdrinks" are template-variant reworkings of existing
-- "Erdbeben" and "Bierkonsum"/"Bierkonsum 2" respectively (same general
-- topic, different specific statements/facts and different answer keys) —
-- confirmed genuinely distinct and kept, consistent with how this project
-- already treats "Carina"/"Carina 2"/"Mallorca"/"Mallorca 2" as legitimate
-- separate variants rather than near-duplicates.

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Elbjazz-Festival', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Mehr Jugendliche in der EU wählen eine Ausbildung statt eines Studiums.', true),
  (2, 'Das Bundesgesundheitsministerium fördert ausländische Pflegekräfte.', true),
  (3, 'Das „Elbjazz-Festival" findet in diesem Jahr ausschließlich im Freien statt.', false),
  (4, 'Archäologen stießen auf ein kaum beschädigtes Grab aus der Keltenzeit.', true),
  (5, 'Im Norden Deutschlands wird ruhiges Sommerwetter erwartet.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Bürger', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Reworded template variant of this project''s existing "Erdbeben" exercise (same general topic, different statements/facts and different answer key) — confirmed genuinely distinct before import. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Bürger suchten nach dem Beben Kontakt zu den Einsatzkräften.', true),
  (2, 'Die Erzieher in der Kita beraten die Eltern zum Impfen.', false),
  (3, 'Verkehrsbehinderungen werden vor allem für das Wochenende erwartet.', true),
  (4, 'Defekte Rohrleitungen sind die Hauptursache für Umweltschäden in SH.', false),
  (5, 'Die Schadstoffbelastung der Luft nimmt nächste Woche ab.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Nord-Ostsee', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Die Stadt stoppt den Bau neuer E-Ladestationen.', false),
  (2, 'Besucher können das Elefantenbaby ab jetzt sehen.', false),
  (3, 'Die Arbeitslosigkeit im Handwerk wird bald abnehmen.', false),
  (4, 'Das neue Hochhaus wird aus Denkmalschutzgründen niedriger.', true),
  (5, 'Ein Schiff blockiert noch immer den Nord-Ostsee-Kanal.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('AirBerlin', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'AirBerlin-New ist wieder europäischer Branchenführer.', false),
  (2, 'Ein Sportverein in Hamburg bietet nur Kurse für Mitglieder an.', false),
  (3, 'In der Altenpflege gibt es weiterhin große Personalprobleme.', true),
  (4, 'Durch dreifach verglaste Fenster sinken die Heizkosten deutlich.', false),
  (5, 'Marc Weber ist wieder für Turniere zugelassen.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Softdrinks', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Reworded template variant of this project''s existing "Bierkonsum"/"Bierkonsum 2" exercises (same general template, different specific topic/statements and different answer key) — confirmed genuinely distinct before import. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Der Konsum von zuckerhaltigen Softdrinks steigt um 10 %.', true),
  (2, 'Bei den Lebenshaltungskosten liegt Deutschland im EU-Vergleich nur im Mittelfeld.', true),
  (3, 'Das Ende des Pilotenstreiks ist absehbar.', false),
  (4, 'Experten befürchten Gewalt bei Sportevents.', true),
  (5, 'Die Leopoldina strebt eine stärkere internationale Ausrichtung an.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Co-Living', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Co-Living ist inzwischen ein Standardmodell für Familien.', false),
  (2, 'KI-Systeme machen Ärzte in Zukunft überflüssig.', false),
  (3, 'Der Fast-Fashion-Markt wächst trotz Nachhaltigkeitstrend weiter.', true),
  (4, 'Ein Gratis-ÖPNV reicht als Lösung für die Verkehrswende aus.', false),
  (5, 'Die Bevölkerung befürwortet Pflegeroboter ohne Vorbehalte.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Homeoffice', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Dauerhaftes Homeoffice verringert die Produktivität in Unternehmen.', false),
  (2, 'Der internationale Flugverkehr verzeichnet kein beschleunigtes Wachstum.', true),
  (3, 'Online-Weiterbildungen ersetzen zunehmend klassische Präsenzkurse.', false),
  (4, 'Der Ausbau der Windenergie wird allgemein befürwortet.', false),
  (5, 'Digitale Bezahlsysteme haben Bargeld in Europa verdrängt.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Paris', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Paris erlaubt weiterhin Leihscooter ohne Einschränkungen.', false),
  (2, 'Durch KI werden Krankheiten zuverlässiger erkannt.', true),
  (3, 'Australien will den Zugang zum Great Barrier Reef touristisch ausweiten.', false),
  (4, 'Laut Studien entsteht durch Smartphones im Unterricht kein Lernnachteil.', false),
  (5, 'Die neue Steuer würde tief in den Energiemarkt der USA eingreifen.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Japan', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Plastiktüten werden seltener genutzt.', true),
  (2, 'Im Homeoffice sinkt die Produktivität der Mitarbeiter.', false),
  (3, 'In Kanada soll man wieder Eisbären jagen dürfen.', false),
  (4, 'Soziale Netzwerke beeinflussen das Kaufverhalten.', true),
  (5, 'Japan will bis 2035 alle Benzinautos verbieten.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Theaterpremiere', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Die Theaterpremiere fällt wegen Krankheit der Schauspielerin aus.', false),
  (2, 'Die Deutsche Bahn plant klimaneutralen Fernverkehr bis 2030.', false),
  (3, 'Pflegemangel herrscht sowohl in ländlichen Regionen als auch in Metropolen.', true),
  (4, 'Stadtparkbau verzögert sich wegen fehlender Genehmigungen.', false),
  (5, 'Die Wohnpauschale gilt unabhängig vom Einkommen der Eltern.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Lorenzo', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Lorenzo Bianchi sagte sein Konzert wegen Krankheit ab.', false),
  (2, 'Die Verkehrswacht fordert neue Maßnahmen im Radverkehr.', true),
  (3, 'Der Lehrermangel betrifft vor allem Großstädte.', false),
  (4, 'Die Eröffnung des Museums ist für den Herbst geplant.', false),
  (5, 'Privatpersonen profitieren vom neuen Steuermodell.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('EU-Klimapaket', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'EU-Klimapaket betrifft auch Mittelstand.', false),
  (2, 'Viele Beschäftigte wollen nur im Büro arbeiten.', false),
  (3, 'Die Strecke Berlin–Hamburg bleibt nach Sabotage länger gesperrt.', false),
  (4, 'Laut Experten belasten Arzneimittel das Grundwasser.', true),
  (5, 'Cannes-Festival wegen Streiks abgebrochen.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Frühzeitige', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Frühzeitige Wetterwarnungen konnten Evakuierungen im Süden nicht verhindern.', true),
  (2, 'Junge Erwachsene sehen das Auto wieder häufiger als Statussymbol.', false),
  (3, 'Private Kassen lehnen die Gesundheitsreform ab, gesetzliche befürworten sie.', true),
  (4, 'Mikroplastik gelangt laut Forschung auch über die Luft in den Körper.', true),
  (5, 'Die Art Basel wurde wegen Stromproblemen komplett abgesagt.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Fahrkarten', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Fahrkarten sind in Großstädten zuletzt stark im Preis gesunken.', false),
  (2, 'Die Ausstellung im Naturkundemuseum beschränkt sich auf die Tierwelt Europas.', false),
  (3, 'Der Sportanteil unter Jugendlichen ist rückläufig.', true),
  (4, 'In Polen kam ein Schauspieler wegen Steuern ins Gefängnis.', false),
  (5, 'Der Brand führte zu erheblichen Verkehrsbehinderungen.', true)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Busfahrer', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Länder fordern einheitliche Regeln gegen Wohnungsknappheit.', true),
  (2, 'Ein geplantes Solarkraftwerk in Spanien stößt auf breite Zustimmung der Anwohner.', false),
  (3, 'Die Ausstellung zeigt nur Technik aus dem 21. Jahrhundert.', false),
  (4, 'Ein Busfahrer in Wien wurde für sein mutiges Eingreifen bei einem Überfall ausgezeichnet.', true),
  (5, 'Die Gründe für den Stromausfall in Prag stehen inzwischen fest.', false)
) AS v(n, txt, correct);

WITH ex AS (
  INSERT INTO hoeren_exercises (title, teil, level, position, import_notes)
  VALUES ('Belegschaftsengpass', 1, 'TELC_B2', 999, 'Migrated from zertify.app (user-owned prior platform), 2026-07-27. Answer key verified via source site reveal.')
  RETURNING id
)
INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
SELECT ex.id, v.n, v.txt, v.correct FROM ex, (VALUES
  (1, 'Der Belegschaftsengpass könnte die öffentliche Verwaltung an den Rand des Zusammenbruchs bringen.', true),
  (2, 'Das Offshore-Windkraftprojekt wird von Umweltgruppen als uneingeschränkt konfliktfrei betrachtet.', false),
  (3, 'Die Ausstellung im Vatikan thematisiert ausschließlich die Restaurierung antiker Stätten.', false),
  (4, 'Die Reaktion der Passagiere wurde von Luftfahrtexperten als Beleg für das hervorragende Krisenmanagement der Piloten gewertet.', false),
  (5, 'Die genauen Ursachen des Frachterunglücks in der Nordsee sind weiterhin Gegenstand einer Untersuchung.', true)
) AS v(n, txt, correct);

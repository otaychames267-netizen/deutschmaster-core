-- Schreiben (B2 Beschwerde) migration from zertify.app: closes the 3 gaps flagged during
-- the earlier zertify.app audit ("Unsere Nachbarschaft...", "Waldschwimmbad...",
-- "Apartmenthaus Frankfurt" ambiguity).
--
-- Full re-audit of all 40 zertify.app B2 Schreiben titles against the 60 already in our DB:
-- 37 already exist. Of those, 5 looked like title mismatches at first glance but were
-- confirmed via content comparison to be the SAME exercise already imported under a
-- shortened title (the zertify list title includes the ad's own tagline, which our DB
-- already stores inside the task body, just not in the `exams.title` column):
--   "Fotografieren für Fortgeschrittene!" = existing "Fotografieren für Fortgeschrittene (Shooting Werkstatt)"
--   "Rundum sorglos unterwegs – die Securvia Reisegepäckversicherung" = existing "Rundum sorglos unterwegs – die Securvia"
--   "Schlüsseldienst- Notservice bundesweit" = existing "SCHLÜSSELDIENST-NOTSERVICE bundesweit"
--   "T & W Elektronikversicherung Wir schützen Ihre Haushaltsgeräte !" = existing "T & W Elektronikversicherung"
--   "Umzugsunternehmen Bühler - der Perfekte Partner für Ihren Umzug !" = existing "Umzugsunternehmen Bühler"
-- The remaining 3 are genuinely new (confirmed via full-text search against exam_items,
-- no match found) and are inserted below, titles preserved exactly as on zertify.app.
-- min_words=180/max_words=220 matches the fixed convention already used by every other
-- B2 Beschwerde exam in this table.
--
-- B1 Schreiben (Brief) was also compared: zertify.app has 34 B1 letter-writer names,
-- ~25 of which are not yet in our DB. Deferred pending user decision (B1 content is
-- currently hidden from regular students per [[project-b2-only-and-pruefungssimulation]]).

WITH ex AS (
  INSERT INTO exams (title, level, module, section, exam_type, status, display_order, metadata)
  VALUES ('Apartmenthaus Frankfurt', 'TELC_B2', 'schriftlich', 'schreiben', 'vorbereitung', 'published', 999,
    '{"category":"beschwerde","difficulty":"Standard","estimated_minutes":30}'::jsonb)
  RETURNING id
)
INSERT INTO exam_items (exam_id, position, kind, content, points)
SELECT ex.id, 1, 'writing_prompt',
  jsonb_build_object(
    'task', 'Apartmenthaus Frankfurt

Möblierte Wohnungen auf Zeit

Sie sind für ein paar Monate beruflich oder privat in Frankfurt?

Sie möchten nicht in einem Hotel leben, aber auf Komfort nicht verzichten? In unserem Apartmenthaus, das im Stadtzentrum von Frankfurt liegt, finden Sie eine Unterkunft ganz nach Ihrem Geschmack:

Wir bieten Ihnen:
• voll ausgestattete, möblierte Wohnungen und Zimmer
• Handtücher und Bettwäsche inklusive
• für Privatpersonen und Mitarbeiter von Firmen
• Mietdauer ab 1 Monat
• 1- bis 4-Zimmer-Wohnungen
• ab 1200 € im Monat inklusive Nebenkosten

Serviceleistungen können dazugebucht werden, z. B. Parkplatz, Reinigung, Wäscheservice, Frühstück.

Der Preis richtet sich nach der Mietdauer und den gewünschten Serviceleistungen. Wir beraten Sie per E-Mail, telefonisch sowie persönlich und vermitteln Ihnen eine Wohnung, die Ihren Wünschen entspricht. Mehr Informationen hier:

Website: www.apartmenthaus-frankfurt.de
Address: Kaiserstr. 63, 60329 Frankfurt
E-Mail: apartmenthaus@frankfurt.de

Aufgabe

Schreiben Sie eine Antwort. Behandeln Sie folgende Punkte:
• Erklären Sie, warum Sie für ein paar Monate in Frankfurt waren.
• Beschreiben Sie, welche Erfahrungen Sie früher mit ähnlichen Angeboten gemacht hatten.
• Machen Sie Verbesserungsvorschläge.
• Beschreiben Sie, welche Probleme Sie in dem Apartmenthaus hatten.',
    'min_words', 180,
    'max_words', 220
  ), 25
FROM ex;

WITH ex AS (
  INSERT INTO exams (title, level, module, section, exam_type, status, display_order, metadata)
  VALUES ('Unsere Nachbarschaft vernetzt sich: Schon 656 Nachbarn machen mit!', 'TELC_B2', 'schriftlich', 'schreiben', 'vorbereitung', 'published', 999,
    '{"category":"beschwerde","difficulty":"Standard","estimated_minutes":30}'::jsonb)
  RETURNING id
)
INSERT INTO exam_items (exam_id, position, kind, content, points)
SELECT ex.id, 1, 'writing_prompt',
  jsonb_build_object(
    'task', 'Unsere Nachbarschaft vernetzt sich: Schon 656 Nachbarn machen mit!

Schenken, leihen, reparieren oder Dienste wie Baby- oder Hundesitting anbieten, Schreibarbeiten erledigen, Nachhilfe, Blumen gießen oder einfach nur mal Zucker ausleihen ...

www.nachbarschaft.net ist ein Netzwerk zum Aufbau und zur Pflege einer guten Nachbarschaft. Mitglied kann man nur im eigenen oder angrenzenden Viertel werden. Inzwischen sind wir eine bundesweite Plattform.

Seid dabei! Macht mit! Sucht eure Stadt und euer Viertel! Werdet aktiv! Erkundigt euch! Wir freuen uns auf euch!

info@nachbarschaft.net
www.nachbarschaft.net

Sie haben sich bei dem Netzwerk angemeldet, weil Sie neue Kontakte knüpfen und aktiv werden wollten. Leider haben Sie sehr schlechte Erfahrungen gemacht. Schreiben Sie eine Beschwerde an die Betreiber der Website.

Aufgabe

Schreiben Sie eine Antwort. Behandeln Sie folgende Punkte:
• Erklären Sie, warum Sie sich bei dem Netzwerk angemeldet haben.
• Beschreiben Sie, welche Angebote oder Dienste Sie selbst anbieten wollten.
• Legen Sie dar, welche Probleme Sie mit der Plattform oder den anderen Mitgliedern hatten.
• Machen Sie den Betreibern Verbesserungsvorschläge.',
    'min_words', 180,
    'max_words', 220
  ), 25
FROM ex;

WITH ex AS (
  INSERT INTO exams (title, level, module, section, exam_type, status, display_order, metadata)
  VALUES ('Waldschwimmbad Langen', 'TELC_B2', 'schriftlich', 'schreiben', 'vorbereitung', 'published', 999,
    '{"category":"beschwerde","difficulty":"Standard","estimated_minutes":30}'::jsonb)
  RETURNING id
)
INSERT INTO exam_items (exam_id, position, kind, content, points)
SELECT ex.id, 1, 'writing_prompt',
  jsonb_build_object(
    'task', 'Waldschwimmbad Langen

Die Badesaison ist eröffnet.
Sie wollen sich vom Alltagsstress erholen?
Dann sind Sie bei uns richtig.
Auf unserer riesigen Liegewiese gibt es einen abgetrennten Bereich.

Wasserspaß:
Fünf Schwimmbecken, Strömungskanal, Sprudelliegen.

Für die Kleinen:
Beheiztes Kinderplanschbecken mit Rutschbahn, Kinderspielplatz.

Für den Hunger:
Restaurant mit schmackhafter und gesunder Küche, Snackbar.

Waldschwimmbad Langen am neuen Wald
Kontakt: info@waldschwimmbad-langen.de

Sie waren zur Erholung in diesem Schwimmbad , aber Sie waren nicht zufrieden .
Beschwerde an das Waldschwimmbad .

Aufgabe

Schreiben Sie eine Antwort. Behandeln Sie folgende Punkte:
• Legen Sie dar , was Sie von dem Besuch im Waldschwimmbad erwartet.
• Erläutern Sie , welche Angebote im Schwimmbad Sie genutzt habe.
• Beschreiben Sie , warum Sie unzufrieden sind.
• Machen Sie Verbesserungsvorschläge.',
    'min_words', 180,
    'max_words', 220
  ), 25
FROM ex;

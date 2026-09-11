-- Correction per user feedback 2026-09-09: the Produkt-Karten bank was built
-- as 17 themes x 4-5 rhetorical "strategy" variants (S1-S5), drilled into via
-- a theme -> strategy -> detail flow. The user rejected this shape entirely:
-- they want 70 flat, standalone cards (no visible "strategy" grouping/label),
-- each card's Seite-1 structure tailored to that specific real exam's own
-- required Aufgabenstellung points (not one generic skeleton reused for
-- every theme), navigated exactly like Mündlich Teil 2/3 (a flat Hero-Card
-- grid, click -> a 2-tab modal: Struktur / Beispiel).
--
-- This migration drops the strategy columns, adds a per-card title, and
-- starts fresh with a SINGLE demo card (DIGIBIKE) for the user to review
-- before the remaining 69 are built. theme_title is kept (internal
-- grouping/attribution to the real exam, shown only as a subtle badge, never
-- as a "Strategie" label).

TRUNCATE TABLE public.schreiben_produkt_cards;

ALTER TABLE public.schreiben_produkt_cards
  DROP COLUMN IF EXISTS strategy_code,
  DROP COLUMN IF EXISTS strategy_label,
  ADD COLUMN IF NOT EXISTS card_title TEXT NOT NULL DEFAULT '';

ALTER TABLE public.schreiben_produkt_cards ALTER COLUMN card_title DROP DEFAULT;

DROP FUNCTION IF EXISTS public.get_produkt_cards_catalog(text);

CREATE FUNCTION public.get_produkt_cards_catalog(p_level text)
RETURNS TABLE (id uuid, card_title text, theme_title text, sort_order int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.card_title, c.theme_title, c.sort_order
  FROM public.schreiben_produkt_cards c
  WHERE c.level = p_level
  ORDER BY c.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_produkt_cards_catalog(text) TO authenticated;

-- One demo card, grounded in the real DIGIBIKE exam task (exams.title =
-- 'DIGIBIKE – DAS SMARTE HIGHTECH-FAHRRAD'). Its official Aufgabe asks for
-- 3 of: (1) für welche Fahrten genutzt, (2) Erfahrungen mit längeren Touren,
-- (3) Erfahrungen mit dem Kundendienst, (4) Verbesserungsvorschläge — this
-- card's Struktur covers all four, unlike the old generic Werbung/Kauf/
-- Problem1/Problem2 skeleton that was reused unchanged across every theme.
INSERT INTO public.schreiben_produkt_cards
  (level, card_title, theme_title, theme_source, template_text, example_text, sort_order)
VALUES (
  'TELC_B2',
  'DIGIBIKE – Beschwerde nach dem Kauf des Hightech-Fahrrads',
  'DIGIBIKE – Das smarte Hightech-Fahrrad',
  'Reale TELC-B2-Prüfungsaufgabe (Digibike Deutschland GmbH, Hightech-Fahrrad mit Bordcomputer für Fahrdaten/Navigation/Wetter). Die Aufgabe verlangt mindestens drei der vier Punkte: Nutzungszweck, Erfahrung mit längeren Fahrradtouren, Erfahrung mit dem Kundendienst, Verbesserungsvorschläge.',
$tpl$## Betreff
Beschwerde über [Produktname] – Probleme nach [Zeitraum] Nutzung

## Anrede
Sehr geehrte Damen und Herren,

## Einleitung – Kaufanlass
vor [Zeitraum] habe ich bei Ihnen [Produktname] gekauft, nachdem ich durch [Werbequelle: Anzeige/Website/Prospekt] auf [zentrales Werbeversprechen] aufmerksam geworden war. Ich hatte dementsprechend hohe Erwartungen an das Gerät.

## Nutzung
Genutzt habe ich es vor allem für [Nutzungszweck 1, z. B. den täglichen Arbeitsweg] sowie für [Nutzungszweck 2, z. B. längere Ausflüge am Wochenende].

## Erfahrung mit längeren Fahrten
Gerade bei [Situation, z. B. längeren Touren] zeigte sich jedoch, dass [Problem 1, konkret mit technischem/praktischem Detail], was meine ursprüngliche Begeisterung deutlich dämpfte.

## Kundendienst
Als ich daraufhin Ihren Kundendienst [wie oft/auf welchem Weg] kontaktierte, [Problem 2, z. B. keine Rückmeldung/keine Lösung], was die Situation zusätzlich erschwerte.

## Verbesserungsvorschläge & Forderung
Aus meiner Sicht sollten Sie [konkreter Verbesserungsvorschlag]. Konkret erwarte ich von Ihnen [Forderung: Reparatur/Umtausch/Rückerstattung].

## Schluss
Ich bitte um eine Rückmeldung innerhalb von [Frist] und hoffe auf eine zufriedenstellende Lösung.

## Grußformel
Mit freundlichen Grüßen
[Ihr Name]$tpl$,
$ex$Betreff: Beschwerde über das Digibike – Probleme nach vierwöchiger Nutzung

Sehr geehrte Damen und Herren,

vor etwa einem Monat habe ich bei Ihnen das Digibike gekauft, nachdem ich durch Ihre Werbung auf den Bordcomputer mit Navigations- und Fahrdatenanzeige aufmerksam geworden war. Ich hatte entsprechend hohe Erwartungen an das Fahrrad.

Genutzt habe ich es bislang vor allem für meinen täglichen Arbeitsweg sowie für längere Ausflüge am Wochenende. Gerade bei diesen längeren Touren zeigte sich jedoch, dass sich das Display des Bordcomputers nach etwa einer Stunde Fahrzeit regelmäßig aufhängt, sodass mir weder Navigation noch Fahrdaten zur Verfügung stehen – ausgerechnet dann, wenn ich sie am meisten brauche.

Als ich deswegen Ihren Kundendienst zunächst per E-Mail und anschließend telefonisch kontaktierte, erhielt ich weder auf meine Nachricht noch auf zwei Anrufe eine Rückmeldung.

Aus meiner Sicht sollten Sie die Software des Bordcomputers dringend überarbeiten und Ihren Kundendienst deutlich besser erreichbar machen. Konkret erwarte ich von Ihnen entweder eine kostenlose Reparatur des Bordcomputers oder, falls dies nicht möglich ist, eine anteilige Rückerstattung des Kaufpreises.

Ich bitte um eine Rückmeldung innerhalb der nächsten zehn Tage und hoffe auf eine zufriedenstellende Lösung.

Mit freundlichen Grüßen
Karim Belhadj$ex$,
  1
);

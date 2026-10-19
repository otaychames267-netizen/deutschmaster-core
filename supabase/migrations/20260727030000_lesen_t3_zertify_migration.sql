-- Lesen Teil 3 migration from zertify.app: completes the two loose-end exercises flagged
-- during the earlier zertify.app audit ("Geschäftsreisen" answer key was unfinished,
-- "Hautprobleme" was never extracted). Both fully extracted and answer-keyed via the
-- "check answers" reveal, same methodology as the Hören migrations. Titles preserved
-- exactly as on zertify.app (bilingual "Hautprobleme - مشاكل جلدية" title matches the
-- existing bilingual-title precedent already in this table, e.g. "schnelle
-- Wasserfahrzeuge - اعلانات الألوان"). Neither exercise existed in the DB before this.

WITH ex AS (
  INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf, import_notes, sort_order)
  VALUES ('Geschäftsreisen', 3, 'TELC_B2', 'medium', NULL, 'Imported from zertify.app', 44)
  RETURNING id
)
INSERT INTO lesen_t3_texts (exercise_id, letter, title, content)
SELECT ex.id, v.letter, v.title, v.content FROM ex, (VALUES
  ('A', 'Sicherheit heißt, Risiken zu vermeiden.', 'Wir setzen noch einen Schritt davor an: Risiken sollten gar nicht erst entstehen. Dafür arbeiten wir in unserem Allianz-Zentrum für Technik. Und wenn doch etwas passiert: Ein Anruf genügt und wir helfen schnell und unbürokratisch, rund um die Uhr. Denn in der Allianz AutoPlus-Versicherung ist der Schutzbrief gleich mit drin. Und der Auslandsschadenschutz hilft Ihnen in vielen Ländern Europas zusätzlich, wenn Sie unverschuldet in einen Verkehrsunfall verwickelt werden.
Nähere Informationen erhalten Sie im Internet unter www.allianz.de und bei einem Allianz-Fachmann in Ihrer Nähe.'),
  ('B', 'Ein Fest für die Sinne!', 'Bleiben Sie sich in den besten Jahren Ihres Lebens mit einer traumhaften Reise. Luxus ist, was man daraus macht! Und bei uns heißt das: eine Schiffsreise der absoluten Extraklasse – so traumhaft, wie man es sich immer gewünscht hat. Bereisen Sie damit die ganze Welt oder einen kleinen Teil von ihr – wählen Sie Ihr Lieblingsziel aus unserer vielfältigen Angebot. Natürlich inklusive Spitzengastronomie, Kino, Theater und Wellnessbereich – und das auf Flüssen sowie Meeren. Ganz locker und selbstverständlich ohne Kleiderzwang.
www.a-rosa.de'),
  ('C', 'Trigana bietet die komplette Reisewelt auf einen Klick!', 'Von der Pauschalreise oder attraktiven Last-Minute-Angeboten bis hin zu Flügen, Hotels und Mietwagen: einfach online vergleichen, nach Belieben kombinieren und direkt buchen. Bequem von zu Hause aus – rund um die Uhr. Natürlich erfahren Sie bei Trigana auch alles Wissenswerte zu Ihrem Urlaubsziel: das Wetter, die schönsten Sehenswürdigkeiten, beste Restaurants und vieles mehr.
Reisen Sie nicht auf gut Glück, sondern mit Trigana.
Infos: www.trigana.de'),
  ('D', 'EINFACH GUT STATT NUR GÜNSTIG.', 'Was passiert, wenn sich Ihr Kind beim Spielen verletzt und zum Arzt muss, vielleicht sogar ins Krankenhaus? Selbstverständlich nicht die Krankenkasse die Kosten. Aber Sie möchten mehr – eine optimale Versorgung nicht nur für sich selbst, sondern die ganze Familie. Dann wählen Sie die Fürther Allgemeine als Ihre neue Krankenversicherung.
Die Fürther Allgemeine mit dem Rundum-sorglos-Paket für die ganze Familie. Bleiben Sie bei Ihrem Kind, wenn es ins Krankenhaus muss – wir stehen Ihnen auch 24 Stunden am Tag unterstützend zur Seite – das und vieles mehr leistet die Fürther Allgemeine. Bei uns erhalten Sie nicht den günstigsten Tarif, sondern die beste Versorgung.
www.fuerther-allgemeine.org'),
  ('E', 'Leb wohl, Stau. Leb wohl, erfolglose Hotelsuche.', 'Leb wohl, schlechter Restaurant-Tipp.
Denn dank der aktiven Unterstützung von Assist müssen Sie als Fahrer viele unerfreuliche Seiten der Mobilität nicht mehr erleben. Assist informiert über aktuelle Verkehrssituation, gibt Stauwarnungen und empfiehlt Alternativrouten. Mit dem Mobilfunknetz ermittelt das System sogar Ihren Standort und leistet automatisch Hilfe. Gewünschte Informationen wie z. B. 3 Multirouten-Vergleiche mit aktueller Stauwarnung oder Branchenbuchs werden Ihnen per Datenübertragung direkt in Ihr Navigationssystem gesendet.
Sie sehen: Als Fahrer auf das Wesentliche konzentrieren – mit Assist – jetzt bei Ihrem Autohändler.'),
  ('F', 'SCHIFFSREISE ... mal anders!', 'Entdecken Sie mit der ganzen Familie Deutschland neu. Auf unserem modernen Ausflugsschiff „Pippi Langstrumpf“ gibt es kleine wie große Tanzeinlagen, Restaurants, in denen man Anzug tragen muss – nein, das müssen Sie sich nicht vorstellen! Sie schippern ganz locker auf einem Schiff, ein Entdeckermuseum, in dem die Kleinen alles selbst machen können und Flüsse in Deutschland entdecken, während Sie sich eine echte Piratenrestaurant, in dem die kleinen Seeräuber kochen können. Da wird es nie langweilig! Und während sich unsere erfahrenen Betreuer um Ihre kleinen kümmern, können die Eltern ganz entspannt die Landschaft bewundern – oder doch mal einen Tee trinken. Nehmen Sie über Ihre Reisen mit der „Pippi Langstrumpf“ in Ihrem Reisebüro!'),
  ('G', 'Bundeswertpapiere helfen in den Sattel.', 'Ob große Dressurhoffnung, Tennistalent oder begabter Kicker: Damit Ihr Nachwuchs später auf dem Siegertreppchen landet, sollten Sie ihre familiären Förderung früh genug mit Bundeswertpapieren auf Trab bringen. Bundeswertpapiere mit Laufzeiten von ein bis zehn Jahren – jetzt umsteigen auf Bundeswertpapiere mit jährlicher Zinszahlung und absoluter Sicherheit abgesichert ist.
Bundeswertpapiere erhalten Sie bei Kreditinstituten und allen Landeszentralbanken.
www.bwonline.de'),
  ('H', '', 'Statistisch gesehen arbeitet ein Mensch 35,7 Jahre seines Lebens. Für uns ist Ihr Leben schon ein Startwerk. Es ist einzigartig. Daher bieten wir Ihnen eine Altersvorsorge, die sich persönlich auf Ihr Leben abgestimmt ist. Gehen Sie an den Ruhestand wie Sie es wollen. Bauen Sie jederzeit Vermögen nach Ihren Vorstellungen auf. Sprechen Sie mit unseren kompetenten Partnern und entscheiden Sie selbst, wie lange Sie arbeiten wollen.
Wir begleiten Sie. Wir sichern Sie.
Ein Leben lang.
www.AXIS.de'),
  ('I', '', 'Für alle, die in Kellern nicht nur Discos suchen. Tauchen Sie dann doch einfach mal zur Historie von Speyer im Keller des Speyrer Doms. Oder besuchen Sie einer der zahlreichen Weinkeller, um ein gutes Glas zu trinken. Die Pfalz.
www.suedlicheweinstrasse.de'),
  ('J', 'Nicht genug Platz?', 'Die Welt mitgestalten. Neue Möbel kaufen, Material für den Umbau in der Wohnung transportieren – das können die meisten Heimwerker und Familien mit dem richtigen Fahrzeug fahren, nämlich jetzt mit dem Vaneo. Mit bis zu 3.000 Litern Laderaum, zwei Schiebetüren und zahlreichen Sicherheitsmerkmalen ausgestattet. Und natürlich mit Platz für Sie und eine ganze Familie.
Entdecken Sie Ihren Vaneo.
www.autohaus-miltner.de'),
  ('K', '', 'Was immer Sie von einem kompakten Automobil erwarten – der Jazz übertrifft Ihre Vorstellungen. Angefangen bei seinem neuen 1.4 i-DSI-Motor, der auch äußerst niedrigen Kraftstoffverbrauch aufweist. Deshalb könnte der Tank besonders flach ausfallen – das bedeutet: weniger Gewicht, wo man ihn wohl am wenigsten erwartet: unter dem Fahrersitz. So gewinnen Sie enorm viel Platz spart. Und das ist der Grund, warum Ihnen der neue Jazz den größten und flexibelsten Innenraum seiner Klasse bietet – nicht nur für Sie selbst, sondern für die ganze Familie.
Mehr Informationen dürfen Sie unter www.jazz.de erwarten.'),
  ('L', '„Die WK weiß, wie Vater Staat meine Rente fördert.“', 'Und das ist auch gut so, denn die Rentenreform lässt mehr Fragen offen, als sie beantwortet. Mit der Förder-Invest-Rente der WK können Sie das Beste aus dieser Reform machen. Wir sagen Ihnen, wie Sie heute Ihre gesetzliche Rente ergänzen, damit Sie nach Ihrem Arbeitsleben mit Mitte sechzig eine optimale Rente erhalten. Jahr für Jahr erhalten Sie außerdem Zulagen von Vater Staat. Viele Arbeitnehmer in der gesetzlichen Rentenversicherung können die staatliche Förderung in Anspruch nehmen – und sie sollten es, damit private Vorsorge nicht nur auf dem Papier Zukunft hat.
www.wk.de')
) AS v(letter, title, content);

WITH ex AS (SELECT id FROM lesen_exercises WHERE title = 'Geschäftsreisen' AND teil = 3)
INSERT INTO lesen_t3_situations (exercise_id, number, description, correct_letter, no_match)
SELECT ex.id, v.n, v.description, v.correct_letter, v.no_match FROM ex, (VALUES
  (11, 'Ein Bekannter möchte auf seinen Geschäftsreisen mit seinem Auto immer schnell vorankommen.', 'E', false),
  (12, 'Eine bekannte Familie sucht eine leistungsstarke Krankenversicherung.', 'D', false),
  (13, 'Ein Bekannter sucht eine private Rentenversicherung, die ihm etwas auszahlt, wenn er 50 ist.', 'H', false),
  (14, 'Eine Bekannte möchte sich über Urlaubsangebote informieren, hat aber keine Zeit, in ein Reisebüro zu gehen.', 'C', false),
  (15, 'Ihre Eltern möchten eine Kreuzfahrt im Mittelmeer unternehmen.', 'B', false),
  (16, 'Ein Bekannter sucht für seine Cousine einen Sportverein, in dem junge Talente gefördert werden.', NULL, true),
  (17, 'Ein Bekannter interessiert sich für Geschichte sowie Kultur und möchte Urlaub in einer deutschen Weinregion machen.', 'I', false),
  (18, 'Sie suchen ein Auto mit Platz für bis zu 5 Personen, aber einem möglichst geringen Benzinverbrauch.', 'K', false),
  (19, 'Sie möchten vor einer Auslandsreise eine Auslandskrankenversicherung für die ganze Familie abschließen.', NULL, true),
  (20, 'Eine bekannte Familie möchte einen Urlaub machen, der auch für ihre 3- und 5-jährigen Kinder interessant ist.', 'F', false)
) AS v(n, description, correct_letter, no_match);

WITH ex AS (
  INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf, import_notes, sort_order)
  VALUES ('Hautprobleme - مشاكل جلدية', 3, 'TELC_B2', 'medium', NULL, 'Imported from zertify.app', 45)
  RETURNING id
)
INSERT INTO lesen_t3_texts (exercise_id, letter, title, content)
SELECT ex.id, v.letter, v.title, v.content FROM ex, (VALUES
  ('A', 'Ratgeber "Was bei Erkältung hilft"', 'Erkältungen gehören leider zum Leben. Sie kommen immer wieder wie Frühling, Sommer, Herbst und Winter. Jetzt ist wieder Erkältungssaison. Hier sind einige wichtige Tipps. Bei Fieber: mindestens 2-3 Liter Tee oder Wasser pro Tag trinken. Feuchte Wadenwickel können helfen. Ist das Fieber nach zwei Tagen nicht weg, unbedingt zum Arzt gehen. Bei Halsweh mit Salzwasser gurgeln (1 Glas Wasser ein Teelöffel Salze) oder Salbeitee trinken.'),
  ('B', 'Wir zeigen den kosten die Zähne!', 'Für alle, die noch viel vorhaben: Sichern Sie sich Top-Leistung zu Top-Konditionen! Genießen Sie den maßgeschneiderten privaten Versicherungsschutz für Zähne und die zuverlässige Sicherheit der WORMSER. Da lohnt sich der Wechsel: bis zum 31.12. handeln und dauerhaft von Beitrags-Vorteil profitieren. Ein Leben lang! Mehr Informationen kostenfrei unter 0700/4332000.'),
  ('C', '', 'Kochen und waschen um 1900 lautet das Thema, wenn Anita Krämer am kommenden Sonntag durch das Museum für Stadtgeschichte führt. Wie wurde damals gekocht und gewaschen? Wie haben unsere Ur- Ur- Großeltern damals gelebt? Kühlschrank, Mikrowelle und andere moderne Geräte gab es ja in jener Zeit noch nicht. Wie hat man Speisen haltbar gemacht? Wie wurde gebügelt? Auf all diese Fragen hat Frau Krämer eine Antwort. Auch Kinder sind herzlich willkommen. Sie werden auch erfahren, wie oft Kinder damals gewaschen wurden. Wie sah es mit der Zahnpflege aus? Eine spannende und unterhaltsame Reise in die Zeit von vor 100 Jahren. Der Eintritt ist frei. Die Führung findet immer in Gruppen von 10 Personen ab 10 Uhr zu jeder vollen Stunde statt. Museum für Stadtgeschichte, Alte Waldstraße 11.'),
  ('D', 'Lesen, was gesund macht', 'Jetzt in der neuen Apotheken-Revue:
- Ohrprobleme: endlich wieder gut hören!
- Hautpflege: gut geschützt durch jede Jahreszeit
- Kampo: heilen mit traditioneller japanischer Medizin
Diese und noch viele weitere interessante Themen rund um Ihre Gesundheit, plus Rätselspaß und tollen Gewinnspiel. Alle 14 Tage neu in Ihrer Apotheke. Kostenlos!'),
  ('E', 'Nachhilfe', 'Wenn es um den Computer geht, wissen viele Kinder längst besser Bescheid als Erwachsene. Fast die Hälfte (47%) der 10- bis 19-Jährigen, in deren Haushalt ein Computer steht, wird vom Vater, Mutter, aber auch von Oma und Opa um Rat gefragt. In der Heinrich-Mann-Schule geben computerbegeisterte Schüler jetzt jeden Samstag von 10-12 Uhr sogar extra Nachhilfekurse für Erwachsene. Start ist am kommenden Samstag, der Schülerservice ist kostenlos! Interessierte Schülerinnen und Schüler, die ihre Erfahrungen weitergeben möchten, können auch gern vorbeikommen und mitmachen.'),
  ('F', 'Vienna CONEKT', 'Versichern Sie Ihr Auto ab 35 Cent am Tag. Sparen Sie zusätzlich mit dem Bonusprogramm und bleiben Sie flexibel: Sie können jederzeit monatlich kündigen.
Jetzt Beitrag direkt berechnen: vienna-conekt.de
018084-33556474
Mit der Vienna Conekt haben sie direkt mehr Vorteile: immer günstig, immer erreichbar (24-Stunden-Schaden-hotline), Ersatzwagengarantie!'),
  ('G', 'Sofort-Versicherung', 'Die Behandlung kommt vom Arzt. Die Fürsorge von ihnen. Die Finanzspritze von uns. Der umfassende Schutz bei Krankheit und Unfall. Auch liebe kann nicht verhindern, dass Ihr Haustier mal krank wird oder einen Unfall hat. Die dadurch notwendige Behandlung oder Operation kann schnell bis zu 1000 Euro kosten. Die neue care-securitas Tierschutzversicherung schützt Sie vor diesem Risiko. Kümmern Sie sich also um Ihren vierbeinigen Patienten - wir kümmern uns um die Kosten. Weitere Informationen unter www.care-securitas.de.'),
  ('H', 'Kindertheater: warum teilen schwer und betteln grausam ist', 'Dass es viel einfacher ist, egoistisch zu sein als mitfühlend, weiß fast jeder. Dass aber auch Menschen, die Hilfe brauchen, der egoistisch sein können, zeig das Stück "Der gute Mensch von Sezuan" von Bertolt Brecht. Und er erzählt es so, dass auch Kinder es verstehen können. Im Theater an der Parkaue wir das Stück am Sonntag um 14 Uhr in der Originalfassung gezeigt. Regisseurin Claudia Kipfel: "Dieses Stück kann man so lassen, wie es ist. Kinder verstehen es sofort." Karten: 0179-666453110, für Kinder ab 8 Jahren. Preise: 12 Euro, Kinder bis 12 Jahre: 7 Euro.'),
  ('I', 'Omnitamol 500 Tabletten', 'Wann nehmen Sie Omnitamol? Bei leichten bis mäßig starken Schmerzen. Bei Fieber und Erkältungen. Wichtig: Nehmen Sie Omnitamol nur 3-4 Tage ein, danach gehen Sie bitte unbedingt zu Ihrem Arzt oder Zahnarzt, wenn ihre Beschwerden sich nicht gebessert haben. Was ist bei Kindern zu berücksichtigen? Omnitamol 500 Tabletten sind nicht geeignet für Kinder unter 6 Jahren. Für Kinder bieten wir Ihnen gesonderte Präparate an. Fragen Sie Ihren Arzt oder Apotheker.'),
  ('J', 'Neue Kleidung kann krank machen', 'Das neue Hemd passt prima zu Lieblingsjeans. Warum also nicht gleich anziehen? Doch Vorsicht: Neue Textilien können Allergien und Hautreizungen auslösen, vor allem bei Kindern und Menschen mit empfindlicher Haut. Grund: Viele Textilien enthalten Farbstoffe oder andere Chemikalien. Tipp: neue Kleidungsstücke vor dem ersten Tragen waschen. Für Babys und Kleinkinder ist Second-Hand-Kleidung eine gute Alternative, da die Schadstoffe schon ausgewaschen sind.'),
  ('K', 'Erkältungszeit = Theaterzeit', 'Zu einem hoffentlich husten- und schnupfenfreien Nachmittag für die ganze Familie lädt das Puppentheater "Die Langohren" am morgigen Sonntag um 15 Uhr ein. Das Ensemble um die professionelle Puppenspielerin Margit Hallmann spielt "Hätschi, kleine Anna" und verspricht ein Theatererlebnis für Erwachsene und Kinder ab 6 Jahren. Die Veranstaltung ist fast ausverkauft. Es gibt noch Restkarten. Tickets unter Telefon (0564) 5404420'),
  ('L', 'Zusatz-Versicherung', 'Liebe Leserin, lieber Leser, gepflegte Zähne hängen oft von der finanziellen Möglichkeiten des Patienten ab. Mit der Krankenkasse alleine kommt oft nicht weit. Mit der DENTAL VERSICHEUNG 100Plus von WarnstädtHyper verdoppeln Sie bei Zahnersatz den Zuschuss Ihrer gesetzlichen Krankenkasse. Keine Altersbegrenzung, günstige Monatsbeiträge. Nutzen Sie noch heute diese wichtigen Vorteile. Rufen sie an: 069-780086753 oder informieren Sie sich im Internet unter www.neue-zaehne.eu. Wir schicken Ihnen die Unterlagen zu.')
) AS v(letter, title, content);

WITH ex AS (SELECT id FROM lesen_exercises WHERE title = 'Hautprobleme - مشاكل جلدية' AND teil = 3)
INSERT INTO lesen_t3_situations (exercise_id, number, description, correct_letter, no_match)
SELECT ex.id, v.n, v.description, v.correct_letter, v.no_match FROM ex, (VALUES
  (11, 'Ein Kollege hat seit ein paar Tagen Hautprobleme und weiß nicht, was die Ursache sein könnte.', 'J', false),
  (12, 'Sie möchten etwas mit ihrer 7-jährigen Tochter Unternehmen.', 'K', false),
  (13, 'Ihre Bekannte hat Fieber, möchte aber keine Tabletten nehmen.', 'A', false),
  (14, 'Das Ehepaar, das unter Ihnen wohnt, möchte etwas über Computer lernen.', 'E', false),
  (15, 'Sie wollen Informationen über eine Zahnversicherung, ohne telefonieren zu müssen.', 'L', false),
  (16, 'Ihre Nachbarin ist seit einer Woche erkältet. Natürliche Heilmittel haben nicht geholfen.', 'I', false),
  (17, 'Sie bekommen Besuch und möchten am Sonntagvormittag etwas Interessantes unternehmen.', 'C', false),
  (18, 'Ihre Freundin interessiert sich für japanische Medizin. Sie suchen als Geburtstagsgeschenk ein Buch zu diesem Thema.', NULL, true),
  (19, 'Sie haben ein Haustier, das im letzten Jahr viel Geld für den Tierarzt gekostet hat. Sie suchen eine Möglichkeit, Kosten zu sparen.', 'G', false),
  (20, 'Sie möchten eine Versicherung für Ihren Neuwagen abschließen und sofort wissen, was es kostet.', 'F', false)
) AS v(n, description, correct_letter, no_match);

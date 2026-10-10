// The 35 real TELC B1 Schreiben tasks (exams.level = 'TELC_B1', section = 'schreiben'; every one is an informal reply to a friend's e-mail with four points),
// divided into 10 topic groups. The first task of every group gets 15 cards, all others 14 → 25×14 + 10×15 = 500.
// `kw` = one regex per task point: every example letter must hit all four (a cheap guard against a letter that forgets a point).
// `question` = the task asks the writer to ask something back, so the letter must contain at least one "?".
const T = (key, exam, theme, kw, extra = {}) => ({ key, exam, theme, kw, ...extra });
const MARK = /Neues|Neuigkeit|erlebt|passiert|in letzter Zeit|bei mir/i;
const BESUCH = /besuch/i;
const TREFF = /treff/i;
const WOHNUNG = /Wohnung|Zimmer|Küche|Balkon|Miete|wohne/i;
const URLAUB = /Urlaub|Ferien|Reise|verreis|reise|fahre/i;
const MUSIK = /Musik|Lieder|Band|Rock|Pop|Konzert|Jazz|Klassik|Songs|DJ|Playlist/i;
const NICHTGESCHRIEBEN = /nicht geschrieben|gemeldet|so lange|lange nicht|viel zu tun|Entschuldig|tut mir leid/i;

export const GROUPS = [
  { name: "Feiern & Partys planen", tasks: [
    T("alicia", "Alicia", "Alicia – Gartenparty für den Englischkurs",
      [/(?=[\s\S]*Freitag)(?=[\s\S]*Samstag)/, /helf|hilf|Hilfe|Vorbereitung|unterstütz|mitbring|übernehm/i, /Regen|regnet/i, /Essen|Salat|Kuchen|Grill|grill|Buffet|Suppe|Pizza|kochen|backen|Nudel|Brot|Obst|Fleisch|Gemüse/i,
       /Idee|Party|Fest|Feier/i, /Köchin|kochst|Kochkunst|Kochkünste|Kochen|Rezept/, /Pläne|Plan|halte|finde|Meinung|denke/, /Garten|Englischkurs|Kurs/]),
    T("iris", "Iris", "Iris – Abschlussparty für den Deutschkurs",
      [/Prüfung|bestanden|gratul|Glückwunsch/i, /Restaurant/i, MUSIK, URLAUB]),
    T("tobias", "Tobias", "Tobias – Einzugsparty in Wien",
      [/komm/i, /mitbring|mitkomm|Begleit|Freund|allein/i, /Musik|Geschenk|Blumen|Wein|Kuchen|Spezialität|Süßigkeiten|Lieder/i, /vorbereit|Reiseführer|informier|recherch|Internet|Stadtplan|Sehenswürdigkeit|anschauen|ansehen|lesen/i]),
  ] },
  { name: "Hochzeit, Geburtstag & Familienfeste", tasks: [
    T("jennifer", "Jennifer", "Jennifer – Hochzeit der Schwester",
      [/Neuigkeit|Nachricht|gratul|freu|Glückwunsch/i, /übernacht|schlafen|Hotel|Zimmer|Gästezimmer|Platz|Unterkunft/i, /komm/i, /Geschenk|schenk/i]),
    T("rita", "Rita", "Rita – Hochzeit und Hochzeitsreise",
      [/Arbeit|Stelle|Job|Kollegen|Firma/i, /bei uns|in meinem Land|Heimat|in meiner Heimat|Brauch|Tradition|bei uns zu Hause/i, /Hochzeitsreise|Insel|Meer|Reise|Urlaub|fahren/i, BESUCH]),
    T("anne", "Anne", "Anne – Laras 30. Geburtstag",
      [/Geschenk|schenk/i, /bleiben|länger|Urlaub|Tage/i, /Zug|Auto|Bahn/i, MARK]),
    T("claudia", "Claudia", "Claudia – Jonas' Geburtstag im Zoo",
      [/Vorschlag|Idee|gern|Lust|treffen/i, /Heimat|meinem Land|bei uns|in meiner Stadt|Heimatstadt|Hauptstadt/i, /Lieblingstier|Tier|Affe|Elefant|Löwe|Pinguin|Giraffe|Tiger|Bär/i, MARK]),
  ] },
  { name: "Besuch, Gäste & Treffen", tasks: [
    T("cora_alex", "Cora und Alex", "Cora und Alex – Besuch im Sommer",
      [/Juni|August|Sommer|Termin|Zeit/i, /Zug|Bus|Flug|anreisen|Bahnhof|Flughafen|fahren|Auto/i, /zusammen|gemeinsam|unternehmen|machen/i, /Marseille/i], { question: true }),
    T("mara", "Mara", "Mara – Reise mit dem neuen Freund",
      [NICHTGESCHRIEBEN, /Freund/i, /Hotel|übernacht|Homestay|Gästezimmer|Pension|schlafen|Zimmer|Wohnung|Campingplatz/i, TREFF]),
    T("caroline", "Caroline", "Caroline – Austauschschülerin zu Besuch",
      [/Schülerin|Besuch|Mädchen|Gast/i, /Essen|Trinken|Tee|Kaffee|kochen|Gericht|Getränk|Brot|Frühstück/i, NICHTGESCHRIEBEN, /Programm|unternehmen|Ausflug|zeigen|Stadt|besichtig|Museum|Park|Kino/i]),
    T("tamara", "Tamara", "Tamara – Treffen auf der Dienstreise",
      [TREFF, /mitbring|mitkomm|Familie|Mann|Frau|Freund|Kinder/i, /Stelle|Arbeit|Job|Firma|Kollegen/i, NICHTGESCHRIEBEN], { question: true }),
  ] },
  { name: "Wohnung, Umzug & Nachbarn", tasks: [
    T("naco", "Naco", "Naco – Neue Wohnung und Nachbarn",
      [BESUCH, WOHNUNG, /Nachbar/i, MARK]),
    T("andreas_wohnung", "Andreas", "Andreas – Neue Wohnung und Computer",
      [/Computer|Laptop|PC|Internet/i, WOHNUNG, BESUCH, MARK]),
    T("jakob", "Jakob", "Jakob – Lauter Nachbar",
      [/solltest|könntest|Tipp|Rat|vorschlagen|sprich|Gespräch|Vermieter|Hausverwaltung|Zettel|Ohrstöpsel|Lärm/i, WOHNUNG, /treff|unternehmen|Kino|Café|Wochenende|Zeit/i, /Nachbarn/i]),
    T("karla", "Karla", "Karla – Neues Leben in Bamberg",
      [/Stadt|Wohnort|Dorf|Gegend|wohne|Viertel/i, WOHNUNG, BESUCH, /Arbeit|Job|Hotel|Rezeption|Kunden|Gäste|Arbeitszeit|Kollegen/i], { question: true }),
  ] },
  { name: "Neue Leute kennenlernen & Ratschläge", tasks: [
    T("nora", "Nora", "Nora – Neue Freunde finden",
      [/Tipp|Verein|Kurs|Sportverein|Gruppe|Treffpunkt|App|Fitness|Chor|Sprachkurs|Nachbar/i, TREFF, /Wohnung|Garten|Nachbarn|Zimmer|Miete|Balkon/i, MARK], { question: true }),
    T("sophie", "Sophie", "Sophie – Allein in Würzburg",
      [MARK, /Freizeit|Hobby|Sport|Kino|Musik|lese|schwimm|koche|spiele|Fußball|tanze/i, /Tipp|Verein|Kurs|Gruppe|Sportverein|Chor|Treff|App/i, BESUCH]),
    T("roberto", "Roberto, der neue Kollege", "Andreas – Neuer Kollege Roberto",
      [/einladen|Essen|Mittagessen|Abendessen|Kaffee|zeigen|Stadt|Verein|vorstell|Wohnung|Ausflug/i, /alleine|allein|Kollegen|Team|zusammen/i, /Urlaub/i, MARK]),
    T("nicole", "Nicole", "Nicole – Der Bruder vor dem Fernseher",
      [/Bruder|Schwester|Geschwister|Freund|Freundin|Freunden/i, /Tipp|solltest|könntest|Rat|vorschlagen/i, /Bruder/i, /gern|gemeinsam|zusammen|mit Freunden|mit meiner|mit meinem/i]),
  ] },
  { name: "Arbeit & Beruf", tasks: [
    T("eva", "Eva", "Eva – Neue Stelle als Journalistin",
      [/Deutsch/i, /Stelle|Journalistin|gratul|Glückwunsch|Zeitschrift|VIA/i, MARK, /Traumberuf|Beruf|werden/i]),
    T("miroslav", "Miroslav", "Miroslav – Eigene Firma gegründet",
      [/Arbeit|arbeite|Job|Stelle|suche/i, /Firma|Idee|Tätigkeit|toll|mutig|gratul|Gartenarbeit/i, MARK, /Kunden/i]),
    T("vera", "Vera", "Vera – Neue Arbeitsstelle und Arbeitsweg",
      [MARK, /Bus|Bahn|Fahrrad|Auto|U-Bahn|zu Fuß|fahre|Straßenbahn/i, /Stelle|Arbeit|Firma|Job/i, /vorschlagen|treffen|unternehmen|Kino|Café|Ausflug|Wochenende|Picknick|Park|Vorschlag/i], { question: true }),
  ] },
  { name: "Urlaub & Reisen planen", tasks: [
    T("anna", "Anna", "Anna – Katze und Blumen im Juli",
      [/Bitte|gern|kann|kümmer|helfen|Katze/i, /Sommer|Juli|Urlaub|Pläne|verreise|fahre/i, NICHTGESCHRIEBEN, /Katze/i], { question: true }),
    T("annika", "Annika", "Annika – Günstig verreisen",
      [/Wochenende/i, /Meer|Stadt|reisen|Reise|Italien|Spanien|Türkei|Berlin|Urlaub/i, /gern|Schwimmen|Wandern|Sport|besichtigen|Museum|Strand|Essen|entspannen/i, /sparen|günstig|billig|Preis|Jugendherberge|Camping|Sonderangebot|Ferienwohnung|Bus|Zug/i]),
    T("paul", "Paul", "Paul – Wanderurlaub in Südtirol",
      [/Termin|Juni|Zeit|passt/i, /Südtirol|Vorschlag|Idee|Wandern|Berge/i, /mitbring|mitkomm|jemand|allein|Freund|Bruder|Schwester/i, /Unterkunft|Hütte|Hotel|Wetter|Ausrüstung|Schuhe|kosten|Kosten|Route|wie viele|wie lange/i], { question: true }),
    T("petra", "Petra", "Petra – Ferienhaus im Schwarzwald",
      [/Schwarzwald/i, /Zug|Auto|Bus|Flug|anreisen|fahren|Bahn/i, /wandern|Wanderung|schwimm|grill|Spiel|Ausflug|Rad|Fahrrad|zusammen|gemeinsam|See/i, /mitbring|mitkomm|Freund|Eltern|Familie|Bruder|Schwester|Kinder/i]),
    T("clara", "Clara", "Clara – Einkaufen vor dem Urlaub",
      [/online|Online|Internet|Shopping|bestell/i, /Geschäft|Laden|Kleidung|kaufe|anprobieren|Läden/i, URLAUB, /einkaufen|Einkaufen|shoppen|mitgehen|mitkommen/i]),
  ] },
  { name: "Urlaubsgrüße, Lieblingsorte & Hobbys", tasks: [
    T("jan", "Jan", "Jan – Grüße aus Rom",
      [/Lieblingsstadt|Stadt/i, MUSIK, URLAUB, TREFF]),
    T("moritz", "Moritz", "Moritz – Grüße aus San Diego",
      [/Lieblingsland|Land/i, /interessier|fremd|Orten|Kultur|Essen|Menschen|Architektur|Sehenswürdig|Natur|Sprache/i, MUSIK, TREFF]),
    T("viktor", "Viktor", "Viktor – Grüße von Malta",
      [/Hobby|Hobbys|Freizeit|Sport|male|lese|koche|fotograf|spiele|schwimm|tanze|Musik/i, /Buch/i, URLAUB, TREFF]),
  ] },
  { name: "Ausflüge & gemeinsame Freizeit", tasks: [
    T("thomas", "Thomas", "Thomas – Ausflug mit Bus und Schiff",
      [/Wetter|Regen|regnet|schlecht/i, /komm|dabei|zusage|gern|Einladung/i, /wissen|Frage|Wohin|wohin|Uhr|Kosten|mitbringen|Treffpunkt|Essen|Rückkehr/i, /Bein|Unfall|gebrochen|Gute Besserung|Besserung|Basketball|Sorge/i], { question: true }),
    T("nadja", "Nadja", "Nadja – Gemeinsamer Garten",
      [/Vorschlag|Idee|gern|Lust|toll/i, /Garten/i, /Weg|Bus|Bahn|Straße|Adresse|fahren|komme|finde|Haltestelle|Fahrrad|Auto/i, MARK], { question: true }),
    T("sonja", "Sonja", "Sonja – Musikfestival in Rüdesheim",
      [/Zug|Auto|Bus|Bahn|fahren|reisen/i, /mitbring|mitkomm|jemand|allein|Freund|Bruder|Schwester|Freundin/i, /übernacht|schlafen|Zelt|Festplatz|Hotel|Campingplatz|Pension|Jugendherberge/i, /Mainz|Schiff|Stadt|Sehenswürdig|Burg|Wein|besichtig|Museum|Ausflug|Rhein|Wanderung|sonst|außerdem|noch/i]),
  ] },
  { name: "Prüfung, Lernen & Deutsch", tasks: [
    T("corinna", "Corinna", "Corinna – Reise nach der Prüfung",
      [/Nordsee|Prag|Amsterdam|Schwarzwald|fahren|Reise|Tour/i, /lerne|lernen|Kurs|Wörter|Vokabeln|Grammatik|üben/i, MARK, /\?/], { question: true }),
    T("emilia", "Emilia", "Emilia – Lerntipps und Besuch",
      [/Zeit|Juli|August|Woche|Wochenende|Termin/i, /Tipp|lernen|Pausen|Lernplan|Karteikarten|Gruppe|Wiederhol|Schlaf/i, /unternehm|Ausflug|Kino|Stadt|Museum|Café|Park|Wanderung|Schwimmen|gemeinsam/i, /übernacht|schlafen|Sofa|Gästezimmer|Hotel|Platz|Matratze|Zimmer/i]),
  ] },
];

// The 10 groups above are only the authoring sections. What students and admins see are TWO pools (owner decision 2026-10-06, like
// B2's Produkt/Dienstleistung): every B1 subscriber is permanently assigned one letter from EACH pool, split by what the friend's
// e-mail asks of you —  A: the friend proposes / invites / plans something together (you decide, offer logistics),
//                       B: the friend shares news or a problem and asks for advice or help (you react, advise, tell about yourself).
// `topic_group` in the DB is POOLS[pool]; the assignment RPC derives the pool letter from its first character.
export const POOLS = { A: "A · Einladung, Vorschlag & Planung", B: "B · Neuigkeiten, Rat & Bitte" };
const POOL_A = new Set(["alicia", "anne", "cora_alex", "claudia", "clara", "corinna", "emilia", "jennifer", "mara", "nadja", "paul", "petra", "sonja", "thomas", "tobias", "tamara", "annika"]);

// Owner decision 2026-10-06 (2nd correction): exactly 250 + 250 letters, no "15 per topic" view. The pools were 243 (A) / 257 (B), so seven
// letters of one topic are filed under pool A at CARD level (the pool is derived from each card's topic_group, not from its task).
export const MOVE_TO_A = { iris: [2, 4, 6, 8, 10, 12, 14] };

/** Flat list with group, pool, card count and sort_order band (101…3515). */
export const TASKS = GROUPS.flatMap((g, gi) => g.tasks.map((t, ti) => ({ ...t, group: g.name, groupIndex: gi, n: ti === 0 ? 15 : 14 })))
  .map((t, i) => ({ ...t, index: i + 1, sortBase: (i + 1) * 100, pool: POOL_A.has(t.key) ? "A" : "B", moveToA: MOVE_TO_A[t.key] ?? [] }));

export const TOTAL = TASKS.reduce((s, t) => s + t.n, 0); // 500

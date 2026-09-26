/** Replace the Frankenstein n38 (garbled Wasserfahrzeuge situations + wrong
 * apartments/furniture ads) with the CLEAN "schnelle Wasserfahrzeuge" exercise
 * transcribed directly from the official PDF images (wf-1/2/3). Situations, ads
 * a-l and key LKXIACFBEX all verified against the PDF. Ad g is partial in the
 * source (heading clipped at the page break; it is a distractor, not in the key)
 * and is stored honestly as a fragment + flag. --apply writes; default dry-run. */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const KEY = "LKXIACFBEX";
const situations = {
  11: "Ein Kollege interessiert sich für schnelle Wasserfahrzeuge.",
  12: "Ein Bekannter möchte barfuß am Meer spazieren gehen.",
  13: "Eine Freundin sucht in Köln und Umgebung für vier Tage ein am Rhein gelegenes 4-Sterne-Hotel.",
  14: "Ihre Nachbarn möchten, dass ihre 7- und 9-jährigen Töchter mehr über den Umgang mit Tieren lernen.",
  15: "Ein befreundetes Ehepaar macht gern Tageswanderungen in Gesellschaft.",
  16: "Eine Bekannte möchte gute Laufschuhe kaufen.",
  17: "Ein Bekannter interessiert sich für die Geschichte der Erde und möchte sich weiterbilden.",
  18: "Ihr Bruder interessiert sich für alte Fahrzeuge und möchte eine Tagesfahrt machen.",
  19: "Ein Freund sammelt Bücher mit den Autogrammen der Autoren.",
  20: "Eine Bekannte ist Goldschmiedin und sucht Schmucksteine für ihre Werkstatt.",
};
const ads = {
  A: { title: "Auf den Höhen des Rheins", content: "Die Wanderung beginnt im Rheingau-Städtchen Rauenthal. Von hier aus geht es über die hügelige Taunuslandschaft – immer wieder mit Blick auf den Rhein – über die Hallgarter Zange nach Oestrich mit seinem historischen Ortskern und dem berühmten Alten Kran. Festes Schuhwerk ist unbedingt empfehlenswert. Gaststätten gibt es auf der Hallgarter Zange und in Oestrich. Von dort aus gibt es auch gute Busverbindungen nach Wiesbaden und Rüdesheim. Info unter: Wanderclub Die Wandervögel, Tel.: 0611-45453326. Gruppentreff: samstags 13.00 Uhr, sonntags 11.00 Uhr, Bushaltestelle Rathaus Rauenthal." },
  B: { title: "Eine Rheinfahrt, die ist lustig", content: "Eine Fahrt für Freunde nostalgischen Reisens: Mit dem 1908 gebauten Schaufelraddampfer Neptun fahren wir von Mainz vorbei am Binger Mäuseturm und an der Loreley in das Städtchen Sankt Goarshausen. Hier erwartet uns ein leckeres Abendessen mit Wein und Gesang. Da fehlt natürlich auch nicht die Loreley, die für uns von ihrem Felsen herabsteigt und alte Volksweisen und Lieder vorträgt. Zurück nach Mainz geht es dann mit einer historischen Dampflok. Information und Anmeldung bei: Touristen-Information Mittelrhein, Tel.: 06134-9988663." },
  C: { title: "Der Wanderladen am Rathausplatz 4 in Wangen", content: "Wir haben alles, was Sie zum Wandern und Bergsteigen brauchen. Auf fast 200 m² finden Sie Markenprodukte bekannter Sportausstatter: Textilien, Pulsmessgeräte, Wanderkarten, Ausrüstungen für Freeclimbing, Nordic Walking, Trekking, Jogging usw. Kurzum: Wir bieten alles vom Spazierstock bis zum Stiefel. Natürlich bieten wir jedem Kunden unsere persönliche fachkundige Beratung an. Weitere Informationen zum Angebot sowie unseren Öffnungszeiten unter 01804-5532210 oder schauen Sie sich unsere Internetseite an: www.wanderladen.de" },
  D: { title: "Mit dem Schiff nach Holland", content: "Ruhe, Erholung, Entspannung und dabei Kultur genießen und köstlich essen und trinken – das alles können Sie während unserer viertägigen Kreuzfahrt auf dem Rhein erleben. Auf einem unserer schwimmenden 4-Sterne-Hotels werden Sie sich sicher wohl fühlen. Alle Schiffe verfügen über Einzel- und Doppelzimmer mit Bad und WC, Restaurant, Bistro, Tanzcafé, Fitnessraum und einem Swimmingpool auf dem Sonnendeck. Start der Reise ist Frankfurt am Main. Etappenziele sind Koblenz, Köln und Düsseldorf. Unser Reiseziel Rotterdam erreichen wir am vierten Tag. Fordern Sie unseren Katalog an unter 0180-3287549." },
  E: { title: "Geschichte und Geschichten vom Rhein", content: "Die alten Römer und Germanen sowie die mittelalterlichen Burgherren sind längst Geschichte. Zahlreiche Sagen und Anekdoten ranken sich bis heute um Bauwerke und Menschen, die am Rhein gelebt haben; Schriftsteller und Dichter wurden zu Werken über und rund um den Rhein inspiriert. Die Stadtbibliothek Bingen hat diesen historischen wie unterhaltsamen Geschichten eine Ausstellung gewidmet, die täglich außer montags von 10 bis 18 Uhr im Bibliotheksgebäude besucht werden kann. Außerdem lesen jeden Sonntag um 20 Uhr im Juli und August Schriftsteller aus ihren Werken – mit Büchertisch und Autogrammstunden. Der Eintritt zu der Ausstellung ist frei, für die Lesungen beträgt er 8 Euro." },
  F: { title: "Der Rhein und seine Geschichte", content: "Das Geologische Institut der Johannes-Gutenberg-Universität Mainz bietet im kommenden Semester im Rahmen des Studium generale eine Vortragsreihe an zum Thema: Der Rhein und seine Geschichte. Was verraten uns bestimmte Gesteinsformationen im Untergrund? Wie kommen versteinerte Meeresbewohner als Fossilien in die rheinhessische Erde? Wie sah es hier vor Jahrmillionen aus? Die Vortragsreihe startet am 1. November und findet jeweils mittwochs um 18.30 Uhr im Auditorium maximum der Universität statt." },
  G: { title: "", content: "[Hinweis: In der Quell-PDF ist der Anfang dieses Info-Textes am Seitenumbruch abgeschnitten. Er ist ein Distraktor und gehört zu keiner Situation im Lösungsschlüssel.] … sich eine geheimnisvolle Höhlenlandschaft mit plät… Natur sinnlich erfahren." },
  H: { title: "Ohne Schuhwerk wandern", content: "Besuchen Sie Deutschlands ersten und einzigen Barfußpfad – ein Riesenspaß für jedes Alter. Der Barfußpfad in Bad Sobernheim zählt zu den beliebtesten Ausflugszielen an dem Fluss Nahe. Die wohltuende Kühle des Lehmbodens und der Wassertretbecken erfrischt müde und schwere Beine. Über verschiedene Geschicklichkeitsparcours gelangen Sie zur Nahefurt. Hier können Sie die Nahe mit Hilfe von zwei Halteseilen überqueren. Gehen Sie barfuß durch die Natur – ein unvergessliches Abenteuer!" },
  I: { title: "Ein Zoo für Jung und Alt", content: "Ein Besuch im Opel-Zoo bietet zu jeder Jahreszeit ein besonderes Erlebnis. In den monatlich stattfindenden pädagogischen Führungen für Kinder und Jugendliche erläutern unsere Zoopädagogen die verschiedensten zoologischen Themen. Darüber hinaus gibt es regelmäßig auch spezielle Ferienprogramme. Für die Kleinen gibt es auch einen Streichelzoo und einen großen Abenteuerspielplatz sowie Kamel- oder Ponyreiten. Für die Großen gibt es Picknick- und Grillplätze, ein Restaurant und vieles mehr. Ein Besuch im Opel-Zoo ist ein unvergessliches Erlebnis für Alt und Jung." },
  J: { title: "Tiere erleben", content: "Mehr als 600 Tiere haben im Safaripark eine neue Heimat gefunden. Hier wurde für sie ein Lebensraum geschaffen, der ihrer ursprünglichen natürlichen Umgebung weitgehend entspricht. Im Safaripark sitzen nicht die Tiere, sondern die Besucher „hinter Gittern“: Im eigenen Auto fährt man durch die großen Tiergehege. Oder man nutzt den Safari-Zug (2,50 € pro Person). Kostenlos ist der Affenzug, der durch das Affengehege fährt. 40 Berberaffen leben hier frei, klettern, springen, toben. Und die Besucher fahren in einer vergitterten Bahn gemächlich durch das Gehege." },
  K: { title: "Wattwanderung", content: "Zweimal täglich gibt das Wasser den Meeresboden frei – es ist die Zeit der Ebbe. Unter sachkundiger Führung können Wattwanderungen zum Beispiel zur Hallig Süderoog, zur Hallig Hooge oder zu Kulturspuren ehemaliger Siedlungen unternommen werden. Barfuß ist Wattwandern am schönsten. Dann spürt man den Wattboden unmittelbar. Wer empfindliche Füße hat, sollte sich ein paar alte Socken oder Turnschuhe anziehen. Wattwanderungen mit erfahrenen Wattführern sind sicherer und erlebnisreicher als auf eigene Faust loszuziehen. Deshalb sollten erste und größere Wattwanderungen in einer geführten Gruppe unternommen werden. Die Tour dauert jeweils 2–2½ Stunden." },
  L: { title: "Die Nordseeküste wirbt für sich am Rhein", content: "Besuch hat sich angesagt, und zwar vom 21. bis zum 23. April: Die Nordsee kommt nach Düsseldorf. Auf der Promenade am Altstadtufer präsentieren sich in einer Zeltlandschaft, verbunden mit einer Aktionsbühne, alle niedersächsischen Küstenorte und die sieben Ostfriesischen Inseln, die Reedereien, Fluggesellschaften und Hotels. Auf dem Rhein erwartet ein feuerroter Katamaran Besucher zu Sonderfahrten. Der CAT N° 1 – sonst auf der Nordsee unterwegs – ist zu besichtigen und zeigt auf dem Rhein seine Stärke: Stolze 12.633 PS schaffen flotte 40 Knoten, das sind 74 km/h – das schnellste Passagierschiff, das jemals den Rhein befuhr!" },
};

// sanity
if (KEY.length !== 10) throw new Error("bad key");
for (const c of KEY) if (c !== "X" && !ads[c]) throw new Error("key letter without ad: " + c);

const rows = await q(`select id, title from lesen_exercises where teil=3 order by created_at offset 37 limit 1;`);
if (!rows.length) throw new Error("target exercise n38 not found");
const id = rows[0].id;
console.log(`Target n38: id=${id} title="${rows[0].title}"`);
console.log(`Key: ${KEY}`);
for (let n = 11; n <= 20; n++) console.log(`  ${n} -> ${KEY[n-11]}  ${situations[n].slice(0,60)}`);

if (!APPLY) { console.log("\n(dry run — re-run with --apply)"); process.exit(0); }

await q(`delete from lesen_t3_situations where exercise_id='${id}';
         delete from lesen_t3_texts where exercise_id='${id}';`);
const sitVals = [];
for (let n = 11; n <= 20; n++) {
  const letter = KEY[n - 11]; const nm = letter === "X"; const cl = /[A-L]/.test(letter) ? `'${letter}'` : "null";
  sitVals.push(`('${id}',${n},${S(situations[n])},${cl},${nm})`);
}
const txtVals = [];
for (const L of "ABCDEFGHIJKL") { const a = ads[L]; txtVals.push(`('${id}','${L}',${S(a.title)},${S(a.content)})`); }
await q(`insert into lesen_t3_situations (exercise_id,number,description,correct_letter,no_match) values ${sitVals.join(",")};
         insert into lesen_t3_texts (exercise_id,letter,title,content) values ${txtVals.join(",")};`);
console.log("\nAPPLIED: n38 replaced with clean 'schnelle Wasserfahrzeuge' (10 situations, 12 ads, key " + KEY + ").");

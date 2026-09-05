/** Give every Lesen Teil 3 exercise a real, content-derived title instead of the
 * generic "Lesen Teil 3 — Übung N" / "Leseverstehen Teil 3 — Übungstest 6" placeholder,
 * matching the short-topic-title convention already used by Teil 1/2 (e.g. "Limonade",
 * "Schlafzug"). Teil 3 exercises are a themed collection of 10 unrelated situations
 * matched against up to 12 info-texts (not a single article), so titles here are
 * necessarily short thematic labels covering the dominant subjects rather than a
 * single noun — derived by reading every situation sentence per exercise.
 * Near-duplicate situation sets (print variants) get the same base title with a
 * "2"/"3" suffix, following this project's existing convention (Herr Martini 2, etc.).
 * --apply to write; dry run otherwise. */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const TITLES = {
  "5ec447af-8635-49ac-87de-569b4baee9a9": "Kurse & Weiterbildung",
  "93cabbf0-e3b2-4561-950b-62320bf5ca56": "Kurse & Weiterbildung 2",
  "116f1534-6783-45f8-be24-24e3a89e4512": "Kurse & Weiterbildung 3",
  "8afed13e-1c05-43c6-82a8-37761151e837": "Freizeit im Rhein-Main-Gebiet",
  "7c655055-e1aa-479e-b923-0c9c36f97530": "Kultur- und Freizeitangebote",
  "a3ef9d56-c145-459d-ba1d-515c53a470e4": "Erholung & Naturerlebnisse",
  "6699d071-4897-4d26-bd9b-e3365a8cdbec": "Fotokurse & Freizeittipps",
  "53595cc7-5dd0-44b6-aa9b-b54b2bd39f6c": "Gesundheit & Wohlbefinden",
  "ffe802f3-63cf-4d64-9665-2ac0041fb879": "Gärten und Natur",
  "7786f5b3-17e8-458a-9f4f-6ac86d13d93b": "Gesundheit & Versicherungen",
  "5cfd305d-7639-442b-be91-8b920648deda": "Musik und Veranstaltungen",
  "5423bce2-bf42-42e3-ae6c-8379a501445f": "Kunst & Naturerlebnisse",
  "ce3320b3-1ae3-4122-a1dd-2b7ed1923d32": "Wohnen & Familienalltag",
  "6a704b65-49eb-4f66-8cde-bb712792a79c": "Freizeit & Stadtleben",
  "85881174-00bc-4095-8951-c30a5177734b": "Ausbildung & Umzug",
  "b6b58aae-507e-4a6e-9d20-4b2d06a1f154": "Ausland & Sprachkenntnisse",
  "13348345-3316-4d9c-afa5-27e405e7f742": "Reise- und Rechtstipps",
  "0879de43-45a9-4ef2-8ff0-fd2df7a97276": "Reise- und Rechtstipps 2",
  "bfe09a28-0bf8-4464-bc7e-3844ec45edcc": "Fernsehen und Unterhaltung",
  "c10a1f78-13dd-4473-817d-1411f5885520": "Fernsehen und Unterhaltung 2",
  "b81efafd-83a3-4373-9c83-7b081ba8ce1f": "Freizeit & Kultur in Berlin",
  "abe5ef0a-414b-4908-9ef5-56f1914cf6a8": "Ausbildung und Bewerbung",
  "e7ade9f8-e0a1-414b-82af-964dbf57589c": "Ausbildung und Bewerbung 2",
  "319c8074-bdd7-497e-8264-bc3f99d662f5": "Sport & Freizeitaktivitäten",
  "15ad6937-defa-47bb-abb6-6a1aa5482d68": "Sport & Freizeitaktivitäten 2",
  "3220f95e-95b0-4a26-8ea5-765568a06400": "Bücher, Vereine & Haustiere",
  "575388a1-b327-4878-924e-44fabe7a1e98": "Wissenssendungen & Reisefilme",
  "0c502eee-446c-4514-b045-d40726857df6": "Persönlichkeitsentwicklung & Alltag",
  "dc0b372e-ec5b-44bf-8fea-f44047e4a431": "Auto, Energie & Haushalt",
  "6fed3f16-b195-4fa1-a5f0-760899857862": "Mode, Möbel & Bühne",
  "7cb11e60-1736-43b5-a353-5584bec5192f": "Natur, Reisen & Wein",
  "e102b262-6e9e-44e9-b13b-488907c5796d": "Musik, Theater & Weihnachten",
  "f2b8df7a-054b-4574-9fe0-3105d5c0531e": "Musik, Theater & Weihnachten 2",
  "acd47cb7-6a7c-48ad-b8ef-d89c9d0dd54c": "Musik, Theater & Weihnachten 3",
  "f2f78678-15b4-480e-b81b-f3014a425ffd": "Berufliche Weiterbildung",
  "9601aefe-4833-4d72-b6ac-ec37aabda064": "Berufliche Weiterbildung 2",
  "13b3255b-9e8c-4b82-8d0b-d04ca92ccef3": "Haushalt, Jobs & Alltag",
  "36e129ff-fc9f-4afb-be76-18606b9abdd8": "Freizeit & Wasserfahrzeuge",
  "5d14386d-10e2-4544-af8b-17ddc6246d0a": "Familie, Haushalt & Freizeit",
  "ee134ed2-0dbf-4738-b3a0-872127d20f79": "Energie, Umwelt & Musik",
  "77f5e333-faf2-41b4-aab6-e68b35b4e212": "Umwelt, Gesundheit & Weiterbildung",
  "e84e3a31-81c4-489b-b42d-5fa6d91dfd3c": "Natur, Landwirtschaft & Beziehungen",
  "04d6aa2c-f18a-427e-89d6-26f43ae8d7cd": "Freizeit, Reisen & Auto",
};

const ids = Object.keys(TITLES);
console.log(`${ids.length} exercises to retitle`);
const dupCheck = new Map();
for (const t of Object.values(TITLES)) dupCheck.set(t, (dupCheck.get(t) || 0) + 1);
const dups = [...dupCheck.entries()].filter(([, c]) => c > 1);
if (dups.length) { console.error("DUPLICATE TITLES:", dups); process.exit(1); }

if (!APPLY) {
  for (const [id, title] of Object.entries(TITLES)) console.log(`  ${id} -> "${title}"`);
  console.log("\n(dry run — pass --apply to write)");
  process.exit(0);
}

for (const [id, title] of Object.entries(TITLES)) {
  await q(`update lesen_exercises set title = ${S(title)} where id = '${id}';`);
}
console.log(`Updated ${ids.length} titles.`);

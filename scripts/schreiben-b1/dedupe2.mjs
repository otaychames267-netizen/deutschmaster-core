// v2 diversity pass: no opening / closing sentence may occur more than CAP times across the 500 letters.
// Keeps the first CAP occurrences in task order and rewrites the later ones:
//   - openers: frame sentences ("…hier kurz meine Antworten", "…Schritt für Schritt") get frame-preserving variants, everything else a
//     tone-matched generic opener (warm vs. neutral, chosen from the card's style label);
//   - closers: plain closers are swapped for a generic one, closers that end in a [[marker]] only get a new lead-in (the marker fill stays,
//     so the blank and its meaning are untouched).
// usage: node scripts/schreiben-b1/dedupe2.mjs [--apply]
import { readFileSync } from "node:fs";
import { TASKS } from "./manifest.mjs";
import { loadTask, parseCard } from "./build.mjs";
import { writeRetry } from "./fsretry.mjs";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CAP = 4, MAXUSE = 2;
const apply = process.argv.includes("--apply");
const NEUTRAL = new Set(["sachlich-strukturiert", "klar und kompakt", "Schritt für Schritt", "begründend, argumentativ", "abwägend, vorsichtig", "hilfsbereit, praktisch"]);

const firstSentence = (ex) => ex.split(/\n+/)[1]?.split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
const lastSentence = (ex) => { const paras = ex.split(/\n+/); const body = paras.slice(0, -2).filter(Boolean); const last = body[body.length - 1] ?? ""; const s = last.split(/(?<=[.!?])\s/); return s[s.length - 1].trim(); };

// ---------- opener pools ----------
const FRAME = {
  "danke für deine Mail, hier kurz meine Antworten.": [
    "danke für deine Mail, ich antworte dir kurz und der Reihe nach.", "danke für deine Nachricht, hier knapp meine Antworten.", "vielen Dank für deine Zeilen, ich fasse mich kurz.",
    "deine Mail ist angekommen, hier meine Antworten in Kürze.", "danke dir für die Nachricht, meine Antworten kommen gleich.", "danke für deine E-Mail, ich antworte dir ohne Umschweife.",
    "ich danke dir für deine Zeilen und antworte dir kurz.", "schön, dass du schreibst, hier meine kurzen Antworten.", "deine Nachricht war klar, deshalb antworte ich genauso klar.",
    "ich habe deine Mail gelesen, hier ist meine knappe Antwort.", "danke fürs Schreiben, ich beantworte alles in Stichpunkten.", "tausend Dank für deine Nachricht, hier die wichtigsten Punkte.",
    "danke für deine Mail, ich halte mich kurz und beantworte alles.", "herzlichen Dank für deine E-Mail, meine Antworten findest du unten.", "danke für die Nachricht, hier sind meine Antworten auf deine Punkte.",
  ],
  "danke für deine Nachricht, ich antworte Schritt für Schritt.": [
    "danke für deine Nachricht, ich gehe der Reihe nach darauf ein.", "vielen Dank für deine Mail, ich beantworte alles Schritt für Schritt.", "danke für deine E-Mail, ich nehme mir deine Punkte nacheinander vor.",
    "danke für deine Zeilen, ich antworte dir in der richtigen Reihenfolge.", "deine Nachricht hat mich erreicht, ich gehe sie Punkt für Punkt durch.", "danke für deine Mail, hier meine Antwort in mehreren Schritten.",
    "ich danke dir für deine Nachricht und gehe Schritt für Schritt vor.", "danke fürs Schreiben, ich arbeite deine Fragen nacheinander ab.", "danke für deine E-Mail, ich beantworte sie am besten der Reihe nach.",
    "herzlichen Dank für deine Nachricht, ich antworte dir ordentlich der Reihe nach.", "danke für deine Mail, ich gehe alles in Ruhe durch, eins nach dem anderen.", "schön, von dir zu lesen, ich antworte dir Punkt für Punkt.",
    "danke für deine Nachricht, ich gliedere meine Antwort in einzelne Schritte.", "vielen Dank für deine Zeilen, hier meine Antwort Stück für Stück.", "danke für deine Mail, ich beantworte sie so, wie du sie geschrieben hast.",
  ],
};
const warm = new Set();
for (const adv of ["riesig", "wirklich", "total", "so sehr", "ehrlich"]) for (const obj of ["deine Nachricht", "deine E-Mail", "deine Mail", "deine Zeilen", "dein Lebenszeichen"]) warm.add(`ich habe mich ${adv} über ${obj} gefreut!`);
for (const adj of ["schön", "nett", "toll", "lieb", "super", "wunderbar"]) for (const cl of ["dass du mir geschrieben hast", "dass du dich gemeldet hast", "von dir zu hören", "dass du an mich denkst", "von dir zu lesen", "dass du dich bei mir meldest", "dass ich von dir höre", "deine Zeilen zu lesen"]) warm.add(`wie ${adj}, ${cl}!`);
for (const o of ["deine Nachricht", "deine Mail", "deine E-Mail", "deine Zeilen"]) for (const p of ["kam genau zur richtigen Zeit", "hat mir den Tag verschönert", "hat mich richtig froh gemacht", "war eine große Überraschung für mich", "hat mich zum Lächeln gebracht"]) warm.add(`${o} ${p}!`);
for (const o of ["endlich habe ich wieder etwas von dir gehört!", "ich habe schon auf eine Nachricht von dir gewartet!", "heute früh lag deine Mail in meinem Postfach, danke dafür!", "gestern Abend habe ich deine Nachricht gelesen, und sie hat mir gut getan!", "was für eine nette Überraschung, deine E-Mail!", "schön, dass es dir gut geht, und danke für deine Zeilen!", "ich habe deine Mail sofort gelesen und mich sehr gefreut!", "toll, dass du dich gemeldet hast, ich habe oft an dich gedacht!", "danke, dass du mir so schnell geschrieben hast!"]) warm.add(o);
const neutral = new Set();
for (const th of ["danke", "vielen Dank", "herzlichen Dank", "besten Dank", "danke dir"]) for (const obj of ["deine Mail", "deine Nachricht", "deine E-Mail", "deine Zeilen", "deine ausführliche Nachricht", "dein Schreiben", "deine Rückmeldung", "deine schnelle Antwort"]) neutral.add(`${th} für ${obj}.`);
for (const obj of ["deine Mail", "deine Nachricht", "deine E-Mail", "deine Zeilen", "dein Schreiben"]) { neutral.add(`ich danke dir für ${obj}.`); neutral.add(`ich habe ${obj} gelesen und antworte dir gern.`); }
for (const o of ["danke, dass du dich gemeldet hast.", "danke, dass du mir geschrieben hast.", "danke für deine Zeilen und deine guten Worte.", "danke für die schnelle und freundliche Nachricht.", "danke, dass du an mich gedacht hast."]) neutral.add(o);

// ---------- closer pools ----------
const LEAD = ["Sag mir bitte, ", "Lass mich bitte wissen, ", "Gib mir bitte Bescheid, ", "Ich würde gern erfahren, ", "Teile mir bitte mit, ", "Schreib mir doch kurz, ", "Antworte mir bitte, ", "Sag mir bitte kurz, ", "Lass es mich wissen, ", "Gib mir kurz Rückmeldung, ", "Erzähl mir doch, ", "Ich bin gespannt, ", "Ich möchte gern wissen, ", "Melde dich bitte bei mir, ", "Sag mir einfach, ", "Lass mich einfach wissen, ", "Schreib mir einfach, ", "Gib mir einfach Bescheid, ", "Bitte sag mir, ", "Ich freue mich auf deine Antwort und möchte wissen, "];
const closersPlain = new Set();
for (const o of ["auf deine Nachricht", "auf ein Lebenszeichen von dir", "darauf, bald von dir zu hören", "auf deine Mail", "auf deine Zeilen", "auf deine Rückmeldung", "auf eine Antwort von dir"]) for (const e of [".", "!"]) closersPlain.add(`Ich freue mich ${o}${e}`);
for (const o of ["deine Antwort", "deine Meinung", "deine Ideen", "deine Vorschläge", "deine Pläne", "deine Rückmeldung"]) closersPlain.add(`Ich bin gespannt auf ${o}.`);
for (const w of ["was du davon hältst", "ob dir das passt", "wie du das siehst", "was du dazu sagst", "ob das für dich in Ordnung ist", "ob du Lust darauf hast"]) closersPlain.add(`Lass mich bitte wissen, ${w}.`);
for (const w of ["bald", "noch diese Woche", "in den nächsten Tagen", "so schnell du kannst", "bis zum Wochenende"]) closersPlain.add(`Gib mir bitte ${w} Bescheid.`);
for (const w of ["deine Nachricht", "dein Lebenszeichen", "deine Antwort", "deine Mail"]) closersPlain.add(`Ich warte gespannt auf ${w}.`);
for (const w of ["wenn du Zeit hast", "in Ruhe", "so bald es dir passt", "sobald du kannst"]) closersPlain.add(`Antworte mir gern, ${w}.`);
for (const w of ["kurz", "ausführlich", "ganz in Ruhe", "bald", "wenn du magst", "bitte bald"]) closersPlain.add(`Schreib mir ${w} zurück.`);
for (const w of ["du antwortest mir bald", "du meldest dich bald", "wir können bald telefonieren", "du schreibst mir bald zurück", "wir sehen uns bald wieder"]) closersPlain.add(`Ich hoffe, ${w}.`);
for (const o of ["Ich hoffe, wir hören bald voneinander.", "Ich bin schon neugierig auf deine Antwort.", "Hoffentlich schreibst du mir bald wieder.", "Ich freue mich über jede Nachricht von dir.", "Lass uns bald wieder Kontakt haben.", "Ich hoffe auf eine baldige Antwort von dir.", "Mach es gut, und melde dich bald bei mir.", "Ich bin gespannt, was du dazu sagst.", "Bitte schreib mir, was du davon hältst."]) closersPlain.add(o);

// ---------- walk the bank ----------
const loaded = [];
for (const task of TASKS) { const cards = await loadTask(task); if (cards) loaded.push({ task, cards }); }
const freq = (fn) => { const m = new Map(); for (const { cards } of loaded) for (const c of cards) { const s = fn(parseCard(c.t).example); if (s) m.set(s, (m.get(s) ?? 0) + 1); } return m; };
const origFirst = freq(firstSentence), origLast = freq(lastSentence);

const seenFirst = new Map(), seenLast = new Map(), use = new Map();
let rot = 0;
// key(s) = the finished sentence a pick would produce (for lead-ins: lead + the unchanged marker tail), so a pick may be reused with another tail
function pickFrom(list, avoid, key = (s) => s) {
  const cands = list.filter((s) => !avoid.has(s) && (use.get(key(s)) ?? 0) < MAXUSE);
  if (!cands.length) throw new Error("pool exhausted");
  cands.sort((a, b) => (use.get(key(a)) ?? 0) - (use.get(key(b)) ?? 0));
  const least = (use.get(key(cands[0])) ?? 0);
  const tier = cands.filter((s) => (use.get(key(s)) ?? 0) === least);
  const p = tier[(rot++ * 7) % tier.length];
  use.set(key(p), (use.get(key(p)) ?? 0) + 1);
  return p;
}
const sentences = (p) => p.split(/(?<=[.!?])\s/);

let nOpen = 0, nClose = 0, skipped = 0, files = 0;
for (const { task, cards } of loaded) {
  const path = `${DIR}tasks/${task.key}.mjs`;
  let src = readFileSync(path, "utf8"); const crlf = src.includes("\r\n"); if (crlf) src = src.replace(/\r\n/g, "\n");
  let touched = false;
  cards.forEach((card, idx) => {
    const raw = card.t; const ex = parseCard(raw).example;
    let t = raw;
    // --- opener ---
    const f = firstSentence(ex);
    const nf = seenFirst.get(f) ?? 0; seenFirst.set(f, nf + 1);
    if (f && nf >= CAP) {
      const paras = t.split("\n\n"); const rawFirst = sentences(paras[1])[0];
      if (rawFirst.includes("[[")) { skipped++; console.log(`!! ${task.key}#${idx + 1}: opener contains a marker, skipped: "${rawFirst.slice(0, 50)}"`); }
      else {
        const pool = FRAME[f] ?? [...(NEUTRAL.has(card.label) ? neutral : warm)];
        const nv = pickFrom(pool, origFirst);
        paras[1] = nv + paras[1].slice(rawFirst.length); t = paras.join("\n\n"); nOpen++;
      }
    }
    // --- closer ---
    const l = lastSentence(parseCard(t).example);
    const nl = seenLast.get(l) ?? 0; seenLast.set(l, nl + 1);
    if (l && nl >= CAP) {
      const paras = t.split("\n\n"); const ci = paras.length - 2; const ss = sentences(paras[ci]); const rawLast = ss[ss.length - 1];
      let nv = null;
      if (!rawLast.includes("[[")) nv = pickFrom([...closersPlain], origLast);
      else {
        const m = /^([^[]+?)(\[\[[\s\S]*)$/.exec(rawLast);
        if (m && /, $/.test(m[1])) { const lead = pickFrom(LEAD, new Set([m[1]]), (s) => s + m[2]); nv = lead + m[2]; }
      }
      if (!nv) { skipped++; console.log(`!! ${task.key}#${idx + 1}: closer not rewritable: "${rawLast.slice(0, 60)}"`); }
      else { ss[ss.length - 1] = nv; paras[ci] = ss.join(" "); t = paras.join("\n\n"); nClose++; }
    }
    if (t !== raw) { if (!src.includes(raw)) { console.log(`!! ${task.key}#${idx + 1}: raw text not found in source`); return; } src = src.replace(raw, () => t); touched = true; }
  });
  if (touched && apply) { writeRetry(path, crlf ? src.replace(/\n/g, "\r\n") : src); files++; }
}
console.log(`${apply ? "applied" : "dry run"}: ${nOpen} openers, ${nClose} closers rewritten, ${skipped} skipped${apply ? `, ${files} files written` : ""}`);

// One-off pass: no opening / closing sentence may occur more than CAP times across the 500 letters.
// Keeps the first CAP occurrences in task order, swaps later ones for fresh, generated alternatives.
// usage: node scripts/schreiben-b1/dedupe.mjs [--apply]
import { readFileSync, writeFileSync } from "node:fs";
import { TASKS } from "./manifest.mjs";
import { loadTask, parseCard } from "./build.mjs";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CAP = 4;
const apply = process.argv.includes("--apply");

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const firstSentence = (ex) => ex.split(/\n+/)[1]?.split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
const lastSentence = (ex) => { const paras = ex.split(/\n+/); const body = paras.slice(0, -2).filter(Boolean); const last = body[body.length - 1] ?? ""; const s = last.split(/(?<=[.!?])\s/); return s[s.length - 1].trim(); };

// ---------- candidate pools (all new sentences, none identical to an existing one) ----------
const openers = new Set();
for (const adv of ["riesig", "wirklich", "total", "so sehr", "ehrlich"]) for (const obj of ["deine Nachricht", "deine E-Mail", "deine Mail", "deine Zeilen", "deine Neuigkeiten", "dein Lebenszeichen"]) openers.add(`ich habe mich ${adv} über ${obj} gefreut!`);
for (const th of ["danke", "vielen Dank", "herzlichen Dank", "lieben Dank", "tausend Dank"]) for (const obj of ["deine Mail", "deine lange Nachricht", "dein Lebenszeichen", "deine netten Zeilen", "deine schnelle Antwort", "deine Neuigkeiten"]) openers.add(`${th} für ${obj}!`);
for (const adj of ["schön", "nett", "toll", "lieb", "super", "wunderbar"]) for (const cl of ["dass du mir geschrieben hast", "dass du dich gemeldet hast", "von dir zu hören", "dass du an mich denkst", "von dir zu lesen", "dass wir wieder in Kontakt sind", "dass du dich bei mir meldest", "dass ich von dir höre", "deine Zeilen zu lesen", "dass du mich nicht vergessen hast"]) openers.add(`wie ${adj}, ${cl}!`);
for (const o of ["deine Nachricht", "deine Mail", "deine E-Mail", "deine Zeilen"]) for (const p of ["kam genau zur richtigen Zeit", "hat mir den Tag verschönert", "hat mich richtig froh gemacht", "war eine große Überraschung für mich", "hat mich zum Lächeln gebracht"]) openers.add(`${o} ${p}!`);
for (const o of ["endlich habe ich wieder etwas von dir gehört!", "ich habe schon auf eine Nachricht von dir gewartet!", "heute früh lag deine Mail in meinem Postfach, danke dafür!", "gestern Abend habe ich deine Nachricht gelesen, und sie hat mir gut getan!", "was für eine nette Überraschung, deine E-Mail!", "deine Nachricht hat meinen ganzen Tag verändert, und zwar zum Guten!", "schön, dass es dir gut geht, und danke für deine Zeilen!", "ich habe deine Mail sofort gelesen und mich sehr gefreut!", "toll, dass du dich gemeldet hast, ich habe oft an dich gedacht!", "danke, dass du mir so schnell geschrieben hast!"]) openers.add(o);

const closers = new Set();
for (const o of ["auf deine Nachricht", "auf ein Lebenszeichen von dir", "darauf, bald von dir zu hören", "auf deine Mail", "auf deine Zeilen", "auf deine Rückmeldung", "auf eine Antwort von dir"]) for (const e of [".", "!"]) closers.add(`Ich freue mich ${o}${e}`);
for (const o of ["deine Antwort", "deine Meinung", "deine Ideen", "deine Vorschläge", "deine Pläne", "deine Rückmeldung"]) closers.add(`Ich bin gespannt auf ${o}.`);
for (const w of ["was du davon hältst", "ob dir das passt", "wie du das siehst", "was du dazu sagst", "ob das für dich in Ordnung ist", "ob du Lust darauf hast"]) closers.add(`Lass mich bitte wissen, ${w}.`);
for (const w of ["bald", "noch diese Woche", "in den nächsten Tagen", "so schnell du kannst", "bis zum Wochenende"]) closers.add(`Gib mir bitte ${w} Bescheid.`);
for (const w of ["deine Nachricht", "dein Lebenszeichen", "deine Antwort", "deine Mail"]) closers.add(`Ich warte gespannt auf ${w}.`);
for (const w of ["wenn du Zeit hast", "in Ruhe", "so bald es dir passt", "sobald du kannst"]) closers.add(`Antworte mir gern, ${w}.`);
for (const w of ["wenn du Lust hast", "wenn du dazu kommst", "gleich nach den Ferien", "in den nächsten Tagen", "sobald du etwas weißt", "wenn es bei dir ruhiger wird"]) closers.add(`Melde dich bitte, ${w}.`);
for (const w of ["kurz", "ausführlich", "ganz in Ruhe", "bald", "wenn du magst", "bitte bald"]) closers.add(`Schreib mir ${w} zurück.`);
for (const a of ["schnelle", "baldige", "ausführliche", "kurze"]) for (const v of ["freuen", "sehr freuen"]) closers.add(`Ich würde mich über eine ${a} Antwort von dir ${v}.`);
for (const w of ["du antwortest mir bald", "du meldest dich bald", "du hast bald Zeit für eine Antwort", "wir können bald telefonieren", "du schreibst mir bald zurück", "wir sehen uns bald wieder"]) closers.add(`Ich hoffe, ${w}.`);
for (const a of ["bitte", "doch"]) for (const b of ["bald", "kurz"]) for (const c of ["Bescheid", "was du denkst"]) closers.add(`Sag mir ${a} ${b}${c === "Bescheid" ? " " : ", "}${c}.`);
for (const a of ["bitte", "doch gern", "gern"]) for (const b of ["bald", "in deiner Antwort", "wenn du Zeit hast"]) closers.add(`Erzähl mir ${a} ${b} mehr davon.`);
for (const w of ["schreib mir, wie es dir geht", "melde dich, wenn du Neuigkeiten hast", "erzähl mir bald, was es Neues gibt", "gib mir bitte kurz Bescheid", "lass bald von dir hören", "pass gut auf dich auf"]) for (const b of ["Bis bald", "Bis dahin"]) closers.add(`${b}, und ${w}.`);
for (const w of ["deine Idee", "deine Meinung dazu", "deinen Plan", "deine Antwort darauf"]) for (const a of ["neugierig", "gespannt"]) closers.add(`Ich bin ${a} auf ${w}, also schreib mir bald.`);
for (const o of ["Ich hoffe, wir hören bald voneinander.", "Ich bin schon neugierig auf deine Antwort.", "Hoffentlich schreibst du mir bald wieder.", "Ich freue mich über jede Nachricht von dir.", "Lass uns bald wieder Kontakt haben.", "Ich hoffe auf eine baldige Antwort von dir.", "Mach es gut, und melde dich bald bei mir.", "Bis zu deiner Antwort denke ich oft an dich.", "Ich bin gespannt, was du dazu sagst.", "Bitte schreib mir, was du davon hältst."]) closers.add(o);

// ---------- walk the bank ----------
const loaded = [];
for (const task of TASKS) {
  const cards = await loadTask(task);
  if (cards) loaded.push({ task, cards });
}
const total = (fn) => { const m = new Map(); for (const { cards } of loaded) for (const c of cards) { const s = fn(parseCard(c.t).example); if (s) m.set(s, (m.get(s) ?? 0) + 1); } return m; };
const origFirst = total(firstSentence), origLast = total(lastSentence);

function make(kind, fn, pool, orig) {
  const used = new Map(); let poolUse = new Map(); const swaps = [];
  const cands = [...pool].filter((s) => !orig.has(s));
  return (card, taskKey, idx) => {
    const ex = parseCard(card.t).example; const s = fn(ex);
    if (!s) return null;
    const n = used.get(s) ?? 0;
    if (n < CAP) { used.set(s, n + 1); return null; }
    const w = words(s);
    // closest length first, deterministic rotation so neighbouring letters do not get the same pick
    const start = (taskKey.length * 7 + idx * 13 + swaps.length * 5) % cands.length;
    const order = [...cands.slice(start), ...cands.slice(0, start)];
    const pick = order.find((c) => (poolUse.get(c) ?? 0) < 1 && words(c) >= w - 1 && words(c) <= w + 3) ?? order.find((c) => (poolUse.get(c) ?? 0) < 1) ?? order.find((c) => (poolUse.get(c) ?? 0) < 2);
    if (!pick) throw new Error(`${kind} pool exhausted at ${taskKey}#${idx + 1}`);
    poolUse.set(pick, (poolUse.get(pick) ?? 0) + 1);
    swaps.push([taskKey, idx + 1, s, pick]);
    return { from: s, to: pick, kind };
  };
}
const swapOpen = make("open", firstSentence, openers, origFirst);
const swapClose = make("close", lastSentence, closers, origLast);

let nOpen = 0, nClose = 0, changedFiles = 0;
for (const { task, cards } of loaded) {
  const path = `${DIR}tasks/${task.key}.mjs`;
  let src = readFileSync(path, "utf8"); const crlf = src.includes("\r\n"); if (crlf) src = src.replace(/\r\n/g, "\n");
  let touched = false;
  cards.forEach((card, idx) => {
    let t = card.t;
    const o = swapOpen(card, task.key, idx);
    if (o) {
      const needle = "\n\n" + o.from; const at = t.indexOf(needle);
      if (at < 0) { console.log(`!! ${task.key}#${idx + 1}: opener not found as plain text: "${o.from}"`); }
      else { t = t.slice(0, at) + "\n\n" + o.to + t.slice(at + needle.length); nOpen++; }
    }
    const probe = { ...card, t };
    const c = swapClose(probe, task.key, idx);
    if (c) {
      const at = t.lastIndexOf(c.from);
      if (at < 0) { console.log(`!! ${task.key}#${idx + 1}: closer not found as plain text: "${c.from}"`); }
      else { t = t.slice(0, at) + c.to + t.slice(at + c.from.length); nClose++; }
    }
    if (t !== card.t) {
      if (!src.includes(card.t)) { console.log(`!! ${task.key}#${idx + 1}: raw text not found in source file`); return; }
      src = src.replace(card.t, () => t); touched = true;
    }
  });
  if (touched && apply) { writeFileSync(path, crlf ? src.replace(/\n/g, "\r\n") : src); changedFiles++; }
}
console.log(`${apply ? "applied" : "dry run"}: ${nOpen} openers, ${nClose} closers swapped${apply ? ` in ${changedFiles} files` : ""}`);

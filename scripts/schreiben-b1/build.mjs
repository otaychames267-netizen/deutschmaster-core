/** Builds + validates the B1 Struktur cards.
 *   node scripts/schreiben-b1/build.mjs            → validate every tasks/<key>.mjs that exists, print a report
 *   node scripts/schreiben-b1/build.mjs --emit     → also write b1_cards.json (all valid tasks, ready for insert.mjs)
 *   node scripts/schreiben-b1/build.mjs alicia     → only that task
 *
 * A task file (tasks/<key>.mjs) default-exports an array of { label, t } where `t` is ONE complete informal reply letter written with
 * [[Platzhalter|ausgefüllter Text]] markers. From the same source the builder derives, paragraph for paragraph:
 *   example_text  = the letter with every marker replaced by its filled text (the "Beispiel" tab), and
 *   template_text = the identical letter with every marker replaced by [Platzhalter] (the "Struktur" tab; rendered as amber pills).
 * So Struktur and Beispiel can never drift apart, and every card's fixed prose is individually written (no shared register templates).
 * Put sentence-final punctuation OUTSIDE the marker so the Struktur keeps it. */
import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { TASKS } from "./manifest.mjs";

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const MARK = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
const ANREDE = /^(Liebe|Lieber|Hallo|Hi|Hey|Servus|Guten Tag|Moin|Liebes)\b/;
const GRUSS = /Gr(u|ü)ß|Bis |Alles Liebe|Herzlich|Dein|Deine|Tschüss|Ciao|Mach's gut|Pass auf|Küsschen|Umarmung|Beste Wünsche|Freundlich/i;
const MIN_WORDS = 105, MAX_WORDS = 150;

const words = (s) => s.trim().split(/\s+/).filter(Boolean);
const grams = (s, n = 3) => { const w = words(s.toLowerCase().replace(/[^a-zäöüß ]+/g, " ")); const out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" ")); return out; };
const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return a.size + b.size - i === 0 ? 0 : i / (a.size + b.size - i); };

export function parseCard(t) {
  const marks = [...t.matchAll(MARK)];
  const example = t.replace(MARK, (_, _l, v) => v).trim();
  const template = t.replace(MARK, (_, l) => `[${l.trim()}]`).trim();
  const fixed = t.replace(MARK, " ").replace(/\s+/g, " ").trim();
  return { example, template, fixed, labels: marks.map((m) => m[1].trim()), fills: marks.map((m) => m[2].trim()) };
}

const firstSentence = (ex) => ex.split(/\n+/)[1]?.split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
const lastSentence = (ex) => { const paras = ex.split(/\n+/); const body = paras.slice(0, -2).filter(Boolean); const last = body[body.length - 1] ?? ""; const s = last.split(/(?<=[.!?])\s/); return s[s.length - 1].trim(); };

export async function loadTask(task) {
  const file = `${DIR}tasks/${task.key}.mjs`;
  if (!existsSync(file)) return null;
  return (await import(pathToFileURL(file).href + "?v=" + Date.now())).default;
}

export function validateTask(task, cards) {
  const issues = [];
  if (cards.length !== task.n) issues.push(`has ${cards.length} cards, needs ${task.n}`);
  const parsed = cards.map((c, i) => ({ ...c, i: i + 1, ...parseCard(c.t) }));
  for (const c of parsed) {
    const tag = `${task.key}#${c.i}`;
    if (/\[\[|\]\]/.test(c.example)) issues.push(`${tag}: unbalanced [[ ]] marker`);
    if (/[{}`]|\$\{/.test(c.t)) issues.push(`${tag}: stray { } or backtick`);
    const wc = words(c.example).length;
    if (wc < MIN_WORDS || wc > MAX_WORDS) issues.push(`${tag}: ${wc} words (needs ${MIN_WORDS}-${MAX_WORDS})`);
    if (!ANREDE.test(c.example)) issues.push(`${tag}: does not open with an Anrede`);
    const lines = c.example.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 4) issues.push(`${tag}: too few lines`);
    if (!GRUSS.test(lines[lines.length - 2] ?? "")) issues.push(`${tag}: second-to-last line is not a Grußformel ("${lines[lines.length - 2]}")`);
    if (!/Name|Absender|Unterschrift/i.test(c.labels[c.labels.length - 1] ?? "")) issues.push(`${tag}: last marker should be the writer's name`);
    task.kw.forEach((re, k) => { if (!re.test(c.example)) issues.push(`${tag}: point ${k + 1} not covered (${re})`); });
    if (task.question && !/\?/.test(c.example)) issues.push(`${tag}: task needs a question back, letter has no "?"`);
    if (c.labels.length < 5 || c.labels.length > 14) issues.push(`${tag}: ${c.labels.length} placeholders (5-14)`);
    for (const l of c.labels) if (l.length < 3 || l.length > 48) issues.push(`${tag}: placeholder label length "${l}"`);
    for (const f of c.fills) if (f.length < 2) issues.push(`${tag}: empty placeholder fill`);
    const fixedRatio = words(c.fixed).length / wc;
    if (fixedRatio < 0.4) issues.push(`${tag}: only ${(fixedRatio * 100).toFixed(0)}% fixed text (>=40% so the Struktur is a real scaffold; keep formulaic phrases OUTSIDE the markers)`);
    for (const f of c.fills) if (words(f).length > 16) issues.push(`${tag}: placeholder fill longer than 16 words ("${f.slice(0, 40)}...")`);
    if (!c.label || c.label.length < 4) issues.push(`${tag}: missing label`);
  }
  // inside the task: no two letters may share their fixed prose or read alike
  for (let a = 0; a < parsed.length; a++) for (let b = a + 1; b < parsed.length; b++) {
    const jt = jaccard(grams(parsed[a].fixed), grams(parsed[b].fixed));
    const je = jaccard(grams(parsed[a].example), grams(parsed[b].example));
    if (jt > 0.22) issues.push(`${task.key}#${a + 1}~#${b + 1}: fixed prose too similar (${jt.toFixed(2)})`);
    if (je > 0.3) issues.push(`${task.key}#${a + 1}~#${b + 1}: letters too similar (${je.toFixed(2)})`);
  }
  const labels = parsed.map((c) => c.label.toLowerCase());
  if (new Set(labels).size !== labels.length) issues.push(`${task.key}: duplicate card labels`);
  return { parsed, issues };
}

if (process.argv[1].replace(/\\/g, "/").endsWith("schreiben-b1/build.mjs")) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const emit = process.argv.includes("--emit");
  const rows = []; const all = []; let bad = 0, done = 0;
  for (const task of TASKS) {
    if (only.length && !only.includes(task.key)) continue;
    const cards = await loadTask(task);
    if (!cards) { console.log(`  --  ${task.key}: no file yet`); continue; }
    const { parsed, issues } = validateTask(task, cards);
    all.push(...parsed.map((p) => ({ task: task.key, ...p })));
    if (issues.length) { bad += issues.length; console.log(`FAIL ${task.key} (${issues.length})`); issues.slice(0, 40).forEach((i) => console.log("       " + i)); continue; }
    done++;
    const avg = Math.round(parsed.reduce((s, c) => s + words(c.example).length, 0) / parsed.length);
    console.log(`  ok  ${task.key}: ${parsed.length} cards, avg ${avg} words`);
    parsed.forEach((c) => rows.push({
      level: "TELC_B1", category: "informell", topic_group: task.group, theme_title: task.theme, theme_source: task.exam,
      card_title: `${task.exam} – Brief ${c.i}: ${c.label}`, template_text: c.template, example_text: c.example, sort_order: task.sortBase + c.i,
    }));
  }
  // global diversity: the same opening / closing sentence must not recur across the bank
  const freq = (arr) => arr.reduce((m, s) => (m.set(s, (m.get(s) ?? 0) + 1), m), new Map());
  for (const [name, fn] of [["opening", firstSentence], ["closing", lastSentence]]) {
    const f = freq(all.map((c) => fn(c.example)).filter(Boolean));
    const dup = [...f].filter(([, n]) => n > 4).sort((a, b) => b[1] - a[1]);
    if (dup.length) { bad += dup.length; console.log(`FAIL global ${name} sentence repeated >4×:`); dup.slice(0, 15).forEach(([s, n]) => console.log(`       ${n}× "${s}"`)); }
  }
  console.log(`${done} task(s) valid, ${rows.length} cards${bad ? `, ${bad} issue(s)` : ""}`);
  if (emit) {
    if (bad) { console.log("not emitting: fix the issues first"); process.exit(1); }
    writeFileSync(`${DIR}b1_cards.json`, JSON.stringify(rows));
    console.log(`wrote b1_cards.json (${rows.length} cards)`);
  }
}

/** Applies the NEW explanation style to B2 Sprachbausteine Teil 1 in batches (pilot: "Leon" via restyle-sb-t1-leon.mjs).
 * A batch file default-exports { "<position>": { "<gap number>": { ok, type, keyword, bed, text, rule, ex, exTr } } }.
 *   ok      the correct option as written in the DB (checked)
 *   type    item_type (vocabulary of ITEM_TYPE_INFO)
 *   keyword Merke chip           bed   Bedeutung (Tunisian)         text  the ✓/✗ explanation (German words in "quotes")
 *   rule    grammar_structure (must differ from keyword)            ex    German example with **bold**      exTr  Tunisian translation
 * Safeguards: correct option vs DB; ALL THREE options named in the text; ≥1 ✓ and ≥2 ✗ lines; no recycled formula verbs; no duplicate explanation text;
 * evidence_text and every other field untouched (unless an entry carries an optional `evidence` sentence, used only after a data fix made the old one wrong); originals saved once to _backup_sb_t1_all.json.
 * Identical gaps in other variants (same surrounding text + same options + same answer) are filled automatically from the store (sb_t1_store.json).
 * Usage: node scripts/learning-aids/sb-t1-apply.mjs <batchFile.mjs> [--apply]      |      node scripts/learning-aids/sb-t1-apply.mjs --seed-leon */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadAll, loadStore } from "./sb-t1-dump.mjs";

const STORE = "scripts/learning-aids/sb_t1_store.json";
const BACKUP = "scripts/learning-aids/_backup_sb_t1_all.json";
const TYPES = new Set(["fixed_expression", "verb", "verb_prep", "noun", "preposition", "conjunction", "adjective_adverb", "tense", "pronoun", "pronoun_adverb", "grammar_structure"]);
const FORMULA = /يستدعي|يستلزم|يستوجب|يحدد/;
const backup = existsSync(BACKUP) ? JSON.parse(readFileSync(BACKUP, "utf8")) : {};
const ex = await loadAll();
const store = loadStore(ex);
const apply = process.argv.includes("--apply");

function validate(e, g, d) {
  const where = `[${e.position}] ${e.title} gap ${g.n}`;
  const need = (c, m) => { if (!c) throw new Error(`${where}: ${m}`); };
  need(d.ok && d.ok.trim().toLowerCase() === g.correct.trim().toLowerCase(), `DB correct is "${g.correct}", you wrote "${d.ok}"`);
  need(TYPES.has(d.type), `bad type ${d.type}`);
  for (const f of ["keyword", "bed", "text", "rule", "ex", "exTr"]) need(typeof d[f] === "string" && d[f].trim(), `missing ${f}`);
  need(d.rule !== d.keyword, "rule equals keyword (UI hides the rule)");
  need(d.ex.includes("**"), "example needs a **bold** target");
  need(d.text.includes("✓") && (d.text.match(/✗/g) ?? []).length >= 2, "text needs one ✓ line and two ✗ lines");
  need(!FORMULA.test(d.text), "recycled formula verb (يستدعي/يحدد/يستلزم/يستوجب)");
  for (const o of g.opts) need(d.text.toLowerCase().includes(`"${o.toLowerCase()}`), `option "${o}" is not named in the text`);
  if (d.evidence !== undefined) need(typeof d.evidence === "string" && d.evidence.includes("**"), "evidence needs the full sentence with the **bold** key");
  return d;
}

if (process.argv.includes("--seed-leon")) {
  const leon = ex.find((e) => e.title === "Leon");
  for (const g of leon.gaps) {
    const it = leon.aids.items[String(g.n)];
    store[g.key] = { ok: g.correct, type: it.item_type, keyword: it.keyword, bed: it.answer_translation, text: it.explanation_correct, rule: it.grammar_structure, ex: it.grammar_example, exTr: it.grammar_translation, from: `${leon.position}#${g.n}` };
  }
  writeFileSync(STORE, JSON.stringify(Object.values(store), null, 1));
  console.log("seeded", Object.keys(store).length, "entries from Leon");
  process.exit(0);
}

const batchFile = process.argv.find((a) => a.endsWith(".mjs") && !a.includes("sb-t1-apply"));
const batch = batchFile ? (await import(pathToFileURL(batchFile).href)).default : {};

// 1) validate + store this batch's gaps
const usedText = new Set(Object.values(store).map((s) => s.text));
for (const [pos, gaps] of Object.entries(batch)) {
  const e = ex.find((x) => x.position === Number(pos)); if (!e) throw new Error(`no exercise at position ${pos}`);
  for (const [n, d] of Object.entries(gaps)) {
    const g = e.gaps.find((x) => x.n === Number(n)); if (!g) throw new Error(`[${pos}] no gap ${n}`);
    if (d.reuse) {
      const [rp, rn] = d.reuse.split("#").map(Number);
      const se = ex.find((x) => x.position === rp); const sg = se?.gaps.find((x) => x.n === rn);
      if (!sg || !store[sg.key]) throw new Error(`[${pos}] gap ${n}: reuse source ${d.reuse} not found in the store`);
      const same = [...sg.opts].map((o) => o.toLowerCase()).sort().join("/") === [...g.opts].map((o) => o.toLowerCase()).sort().join("/") && sg.correct.toLowerCase() === g.correct.toLowerCase();
      if (!same) throw new Error(`[${pos}] gap ${n}: reuse source ${d.reuse} has different options/answer`);
      store[g.key] = { ...store[sg.key], from: `${pos}#${n}` }; continue;
    }
    validate(e, g, d);
    if (!store[g.key] && usedText.has(d.text)) throw new Error(`[${pos}] gap ${n}: identical explanation text already used elsewhere`);
    store[g.key] = { ...d, from: `${pos}#${n}` }; usedText.add(d.text);
  }
}
writeFileSync(STORE, JSON.stringify(Object.values(store), null, 1));

// 2) targets = batch exercises + any not-yet-restyled exercise now fully covered by the store
const targets = [];
for (const e of ex) {
  if (e.aids?.restyle_v2) continue;
  const inBatch = Object.prototype.hasOwnProperty.call(batch, String(e.position));
  const covered = e.gaps.every((g) => store[g.key]);
  if (inBatch && !covered) {
    const missing = e.gaps.filter((g) => !store[g.key]).map((g) => g.n);
    console.log(`PENDING — [${e.position}] ${e.title}: not applied, gaps without an explanation: ${missing.join(", ")} (left for the owner / suspect data)`);
    continue;
  }
  if (covered) targets.push(e);
}
console.log(`targets: ${targets.map((e) => `[${e.position}] ${e.title}`).join(", ") || "none"}`);
if (!targets.length) process.exit(0);

// 3) build merged aids (+ backups)
const merged = {};
for (const e of targets) {
  if (!backup[e.id]) backup[e.id] = e.aids;
  const aids = JSON.parse(JSON.stringify(e.aids));
  for (const g of e.gaps) {
    const s = store[g.key]; const old = aids.items[String(g.n)];
    if (!old) throw new Error(`[${e.position}] gap ${g.n}: no existing item to keep evidence_text from`);
    aids.items[String(g.n)] = { ...old, item_type: s.type, keyword: s.keyword, answer_translation: s.bed, explanation_correct: s.text, explanation_wrong: s.text, grammar_structure: s.rule, grammar_example: s.ex, grammar_translation: s.exTr, ...(s.evidence ? { evidence_text: s.evidence } : {}) };
  }
  aids.restyle_v2 = true;
  merged[e.id] = aids;
}
writeFileSync(BACKUP, JSON.stringify(backup));
const out = batchFile ? batchFile.replace(/\.mjs$/, ".json") : "scripts/learning-aids/sb_t1_restyled_misc.json";
writeFileSync(out, JSON.stringify(merged));
console.log(`built ${Object.keys(merged).length} exercises → ${out}`);
if (apply) {
  console.log(execFileSync("node", ["scripts/learning-aids/apply-learning-aids.mjs", "sb_exercises", out, "--apply"], { encoding: "utf8" }).trim().split("\n").slice(-2).join("\n"));
} else console.log("(dry run — add --apply to write)");

/** SB Teil 2 — adds a structured lead block to every restyled B2 explanation, 2026-10-05 (owner request):
 *   المطلوب: <what the gap needs: verb / noun / preposition / Konnektor …>
 *   القاعدة: "<the rule>"
 *   السبب:  <why this gap needs it (the context clue that used to open the text)>
 *   ✓ … / ✗ …   (unchanged)
 * Rebuilt from sb_t2_store.json (original text + type + rule), never from the DB text, so running it twice cannot double the header.
 * The separate rule line under "Merke" is moved into the explanation (grammar_structure := null) so the rule is not shown twice.
 * Usage: node scripts/learning-aids/sb-t2-add-header.mjs [--apply]   (backup of the current aids → _backup_sb_t2_before_header.json) */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadAll, loadStore } from "./sb-t2-dump.mjs";

const BACKUP = "scripts/learning-aids/_backup_sb_t2_before_header.json";
const OUT = "scripts/learning-aids/sb_t2_header.json";
const CONNECTOR_ADV = /Position\s?[02]|außerdem|deshalb|daher|dennoch|trotzdem|dagegen|allerdings|folglich|somit|stattdessen|zudem|nämlich|vielmehr|zunächst|danach|Folge|Kontrast|Konzession|Gegensatz/i;

function category(s) {
  const probe = `${s.rule} ${s.keyword}`;
  switch (s.type) {
    case "preposition": return "حرف جرّ (Präposition)";
    case "verb_prep": return "فعل + حرف جرّ ثابت (Verb mit Präposition)";
    case "verb": return "فعل (Verb)";
    case "noun": return "اسم (Nomen)";
    case "conjunction": return "رابط / Konnektor (Konjunktion)";
    case "adjective_adverb": return CONNECTOR_ADV.test(probe) ? "رابط / Konnektor (ظرف ربط)" : "صفة أو ظرف (Adjektiv / Adverb)";
    case "tense": return "صيغة فعل (Zeitform / Passiv / Konjunktiv)";
    case "pronoun": return "ضمير (Pronomen)";
    case "pronoun_adverb": return "Pronominaladverb (da- / wo- + حرف جرّ)";
    case "fixed_expression": return "تعبير ثابت (feste Wendung)";
    case "grammar_structure": return "بنية نحويّة (Endung / Struktur)";
    default: throw new Error("unknown type " + s.type);
  }
}

function build(s) {
  const lines = s.text.split("\n");
  const clue = lines[0];
  const rest = lines.slice(1).join("\n");
  const rule = s.rule.replace(/"/g, "'");
  return `المطلوب: ${category(s)}\nالقاعدة: "${rule}"\nالسبب: ${clue}\n${rest}`;
}

const ex = await loadAll();
const store = loadStore(ex);
const backup = existsSync(BACKUP) ? JSON.parse(readFileSync(BACKUP, "utf8")) : {};
const out = {}; let gaps = 0;
for (const e of ex) {
  if (!e.aids?.restyle_v2) continue;
  if (!e.gaps.every((g) => store[g.key])) throw new Error(`[${e.position}] ${e.title}: gap without a store entry`);
  if (!backup[e.id]) backup[e.id] = e.aids;
  const aids = JSON.parse(JSON.stringify(e.aids));
  for (const g of e.gaps) {
    const s = store[g.key]; const it = aids.items[String(g.n)];
    const text = build(s);
    it.explanation_correct = text; it.explanation_wrong = text;
    it.grammar_structure = null; // the rule now lives inside the explanation
    gaps++;
  }
  aids.rule_header_v1 = true;
  out[e.id] = aids;
}
writeFileSync(BACKUP, JSON.stringify(backup));
writeFileSync(OUT, JSON.stringify(out));
console.log(`built ${Object.keys(out).length} exercises / ${gaps} gaps → ${OUT}`);
const sample = Object.values(out)[1].items["33"].explanation_correct; console.log("--- sample ---\n" + sample);
if (process.argv.includes("--apply")) {
  console.log(execFileSync("node", ["scripts/learning-aids/apply-learning-aids.mjs", "sb_exercises", OUT, "--apply"], { encoding: "utf8" }).trim().split("\n").slice(-2).join("\n"));
} else console.log("(dry run — add --apply to write)");

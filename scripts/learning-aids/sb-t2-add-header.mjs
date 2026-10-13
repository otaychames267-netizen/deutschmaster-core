/** SB Teil 2 — adds a structured lead block to every restyled B2 explanation (owner request 2026-10-05, extended the same day):
 *   المطلوب: <what the gap needs: verb / noun / preposition / Konnektor …>
 *   السبب:   <WHY the gap needs that word class — the syntactic signal in the sentence; authored per gap in sb2_why_*.mjs>
 *   القاعدة: "<the rule>"
 *   المعنى:  <the old opening clue: the quoted sentence + its meaning>
 *   ✓ … / ✗ …   (unchanged)
 * Rebuilt from sb_t2_store.json (original text + type + rule), never from the DB text, so running it twice cannot double the header.
 * The separate rule line under "Merke" is moved into the explanation (grammar_structure := null) so the rule is not shown twice.
 * "Why" lookup: sb2_why_*.mjs[position][gap] for the store entry's own position#gap; twin gaps (same quoted sentence + same answer) reuse it.
 * Usage: node scripts/learning-aids/sb-t2-add-header.mjs [--apply]   (backup of the current aids → _backup_sb_t2_before_header.json) */
import { writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadAll, loadStore } from "./sb-t2-dump.mjs";

const DIR = "scripts/learning-aids/";
const BACKUP = DIR + "_backup_sb_t2_before_header.json";
const OUT = DIR + "sb_t2_header.json";
const CONNECTOR_ADV = /Position\s?[02]|außerdem|deshalb|daher|dennoch|trotzdem|dagegen|allerdings|folglich|somit|stattdessen|zudem|nämlich|vielmehr|zunächst|danach|Folge|Kontrast|Konzession|Gegensatz/i;

const why = {}; let typeFix = {};
for (const f of readdirSync(DIR).filter((f) => /^sb2_why_.*\.mjs$/.test(f))) {
  const m = await import(pathToFileURL(process.cwd() + "/" + DIR + f).href);
  for (const [p, g] of Object.entries(m.default)) why[p] = { ...(why[p] || {}), ...g };
  typeFix = { ...typeFix, ...(m.typeFix || {}) };
}
const quoted = (s) => (s.text.split("\n")[0].split('":')[0] || "").replace(/[^A-Za-zÄÖÜäöüß_…]+/g, " ").trim().toLowerCase();
const twin = new Map();
for (const s of Object.values(JSON.parse(readFileSync(DIR + "sb_t2_store.json", "utf8")))) {
  const [p, n] = s.from.split("#").map(Number);
  if (why[p]?.[n]) twin.set(quoted(s) + "|" + s.ok.toLowerCase(), why[p][n]);
}
function whyOf(s) {
  const [p, n] = s.from.split("#").map(Number);
  return why[p]?.[n] ?? twin.get(quoted(s) + "|" + s.ok.toLowerCase());
}
const typeOf = (s) => typeFix[s.from] ?? s.type;

function category(s) {
  const probe = `${s.rule} ${s.keyword}`;
  switch (typeOf(s)) {
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

/** Sanity net: the reason must talk about the same kind of word the header names. */
const EXPECT = {
  preposition: /حرف|Genitiv|Dativ|Akkusativ|Akk/, verb_prep: /حرف|فعل|Infinitiv|منفصل|Pronominal|ثابت/, verb: /فعل|Infinitiv|Partizip|modal/i,
  noun: /اسم/, conjunction: /رابط|جملة|Position|الزوج|Nebensatz|nicht nur|مقارنة|يصحّح|تعارض|يفتح/, adjective_adverb: /ظرف|صفة|Komparativ|Partizip|نهاية|-e/,
  tense: /Partizip|Passiv|Konjunktiv|werden|فعل|Zustandspassiv|Perfekt|Präteritum/, pronoun: /ضمير|فاعل|أداة|كلمة|-e|جمع|Nominativ|Dativ|مفعول|مطابق|مؤنّث|مذكّر|محايد|سؤال|عام/,
  pronoun_adverb: /Pronominaladverb|ظرف/, fixed_expression: /تعبير|ثابت|اسم|حرف|Partizip|صفة|فعل|ظرف/, grammar_structure: /نهاية|-e|Genitiv|Dativ|أداة/,
};

/** Short reasons ('بعد "zu" نحتاج Infinitiv') get one generic sentence on why that class of word is needed at all. */
const BRIDGE = {
  preposition: 'حرف الجرّ هو اللي يربط الاسم بالفعل أو بالاسم اللي قبلو ويحدّد حالتو (Akk. / Dativ / Genitiv).',
  verb_prep: 'هذا الفعل ما يكمل معناه إلا بحرف جرّ ثابت يتحفظ معاه.',
  verb: 'كلّ جملة تحتاج فعل (مصرّف أو Infinitiv / Partizip حسب البنية)، وهنا هو اللي ناقص.',
  noun: 'العبارة فيها أداة أو صفة وتستنّى اسم يكمّلها، وما فماش كلمة أخرى تنجّم تعمل هذا الدور.',
  conjunction: 'الفراغ يربط جزئين من الكلام، وموقع الفعل يبيّن نوع الرابط.',
  adjective_adverb: 'المطلوب كلمة تصف المعنى أو تدرّجو (صفة / ظرف)، موش اسم ولا فعل.',
  tense: 'المطلوب صيغة الفعل بالضبط (فعل مساعد / Partizip / Konjunktiv) حسب بنية الجملة.',
  pronoun: 'المطلوب كلمة تعوّض اسم أو تحدّدو (ضمير / أداة) وتطابقو في النوع والحالة.',
  pronoun_adverb: 'حرف الجرّ + الشيء المذكور يتعوّض بـ da(r)- / wo(r)- باش ما يتكرّرش الكلام ونفتحو الجملة اللي بعدو.',
  fixed_expression: 'هذا تعبير ثابت: كلماتو ما تتبدّلش وتتحفظ كيما هي.',
  grammar_structure: 'المطلوب النهاية أو الصيغة الصحيحة حسب الحالة (Kasus) والعدد.',
};
const longEnough = (w) => (w.includes('":') ? w.slice(w.indexOf('":') + 2) : w).trim().length >= 30;
function build(s) {
  const w = whyOf(s);
  if (!w) throw new Error(`no "why" for ${s.from} (${s.ok})`);
  if (!EXPECT[typeOf(s)].test(w)) console.warn(`  ⚠ ${s.from} ${s.ok} [${typeOf(s)}]: ${w}`);
  const lines = s.text.split("\n");
  const rest = lines.slice(1).join("\n");
  const rule = s.rule.replace(/"/g, "'");
  const reason = longEnough(w) || typeOf(s) === "fixed_expression" ? w : `${w} (${BRIDGE[typeOf(s)]})`;
  return `المطلوب: ${category(s)}\nالسبب: ${reason}\nالقاعدة: "${rule}"\nالمعنى: ${lines[0]}\n${rest}`;
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
    if (typeFix[s.from]) it.item_type = typeFix[s.from];
    gaps++;
  }
  aids.rule_header_v1 = true; aids.why_v1 = true;
  out[e.id] = aids;
}
writeFileSync(BACKUP, JSON.stringify(backup));
writeFileSync(OUT, JSON.stringify(out));
console.log(`built ${Object.keys(out).length} exercises / ${gaps} gaps → ${OUT}`);
const sample = Object.values(out)[1].items["33"].explanation_correct; console.log("--- sample ---\n" + sample);
if (process.argv.includes("--apply")) {
  console.log(execFileSync("node", [DIR + "apply-learning-aids.mjs", "sb_exercises", OUT, "--apply"], { encoding: "utf8" }).trim().split("\n").slice(-2).join("\n"));
} else console.log("(dry run — add --apply to write)");

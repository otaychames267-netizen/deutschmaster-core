/**
 * Upgrades every already-retrofitted sb_exercises.learning_aids gap from the
 * old binary merke_type ("grammar"|"fixed_expression") to the new 10-category
 * item_type taxonomy (see LearningAidsItem.item_type in
 * src/components/learning/types.ts). Classified from signals in the
 * ORIGINAL (pre-retrofit) explanation text saved in _sb_full_dump.json, the
 * same proven approach as classify-sb-merke-type.mjs, extended to a finer
 * ruleset -- see the priority-ordered rules below, each with the real
 * Arabic/German signal it keys off.
 *
 * Dry run by default. Usage:
 *   node scripts/learning-aids/classify-sb-item-type.mjs [--apply]
 */
import { readFileSync, writeFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = {};
for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return JSON.parse(t);
}

const PREPOSITIONS = ["an", "auf", "aus", "bei", "durch", "für", "gegen", "in", "mit", "nach", "ohne", "seit", "über", "um", "unter", "von", "vor", "während", "wegen", "zu", "trotz", "außer", "bis", "entlang", "gemäß", "innerhalb", "außerhalb", "statt", "anstatt"];
const DA_COMPOUND = /^da[rmnu]?(auf|an|von|mit|zu|bei|über|unter|gegen|nach|in|aus|für|durch|vor|hinter|neben|zwischen|raus|rin|rüber|runter)$/i;
const CORRELATIVE_CONNECTOR = /^(sowohl|zwar|einerseits|weder|entweder|nicht nur)\.{0,3}/i;
const STABLE_STATE_FALSE_POSITIVE = /حال[ةه]\s*\S*\s*ثابت\S*/g;

// Closed-class German function words -- checked by direct lookup FIRST,
// before any Arabic-text heuristic, because parsing loose signal-words in
// the explanation prose is unreliable for these (found this session: "vor"
// as a separable-verb prefix false-matched "preposition"; "denen"/"in dem"
// as relative pronouns false-matched "preposition"/"verb_prep" off an
// incidental nearby mention of a different preposition; "falls" and "wie"
// false-matched "verb"/"tense" off incidental mentions of verb position or
// Konjunktiv in the surrounding explanation). A closed, known word list is
// simply more reliable than re-deriving the category from prose each time.
const SUBORDINATING_CONJUNCTIONS = new Set(["wenn", "weil", "dass", "obwohl", "während", "bevor", "nachdem", "sobald", "falls", "indem", "sodass", "so dass", "damit", "ob", "als", "bis", "seitdem", "sofern", "wohingegen", "obgleich", "obschon", "da"]);
const COORDINATING_CONNECTORS = new Set(["aber", "sondern", "denn", "doch", "trotzdem", "deshalb", "daher", "folglich", "jedoch", "allerdings", "nämlich", "sonst", "somit", "dennoch"]);
const INTERROGATIVES = new Set(["wie", "was", "wer", "wo", "wann", "warum", "weshalb", "wieso", "welche", "welcher", "welches", "wovon", "worüber", "wofür"]);
const PRONOUNS = new Set(["ich", "mich", "mir", "du", "dich", "dir", "er", "ihn", "ihm", "sie", "ihr", "sich", "es", "wir", "uns", "euch", "man", "der", "die", "das", "den", "dem", "deren", "dessen", "wessen", "denen", "welchem", "welchen"]);

function classify(originalItem, currentKeyword) {
  const rawKeyword = (originalItem.keyword || "").trim();
  const currentKw = (currentKeyword || "").trim();
  const text = `${originalItem.explanation_correct || ""} ${originalItem.grammar_structure || ""}`;
  const cleanText = text.replace(STABLE_STATE_FALSE_POSITIVE, "");
  const bareWord = rawKeyword.split(/\s+/)[0]?.toLowerCase().replace(/[.,!?]$/, "");
  const words = rawKeyword.toLowerCase().split(/\s+/).map((w) => w.replace(/[.,!?]$/, ""));

  // 1. da(r)-compound answer (davon, daran, darauf...) -- always pronoun_adverb.
  if (DA_COMPOUND.test(bareWord)) return "pronoun_adverb";

  // 2. Two-part correlative connectors -- always conjunction (verified this
  // session: 25/27 of these already said "connector" in the original text;
  // forced for the other 2 for consistency across the whole class).
  if (CORRELATIVE_CONNECTOR.test(rawKeyword) || CORRELATIVE_CONNECTOR.test(currentKw)) return "conjunction";

  // 3. Verb + preposition (Rektion): the answer is a bare preposition AND
  // the original text explicitly discusses a verb governing it (sich
  // freuen auf, warten auf, bestehen aus...). Checked BEFORE the generic
  // fixed-expression marker below, since these are also commonly marked
  // "تعبير ثابت" in the original text and would otherwise all collapse
  // into the less specific fixed_expression bucket.
  if (PREPOSITIONS.includes(bareWord) && /فعل/.test(cleanText) && /حرف\s*الجر|حرف جر/.test(cleanText)) {
    return "verb_prep";
  }

  // 4. "[Adjective/control verb] + zu + Infinitiv" (es ist leicht/schwer/
  // möglich zu..., sich entschließen zu..., versuchen zu...) -- explicitly
  // corrected by the user to grammar_structure, NOT fixed_expression: this
  // is a PRODUCTIVE pattern (any predicative adjective or control verb can
  // fill the slot), unlike a genuine fixed lexical collocation ("in Kauf
  // nehmen") that only exists as that exact word combination. Checked
  // before the generic فعل/حرف الجر signal below so a multi-word keyword
  // like "auf Ihre Anzeige zu antworten" doesn't get diverted to verb_prep
  // off its first word.
  if (/es ist.{0,20}zu[+\s]/i.test(currentKw) || /leicht.{0,10}zu[+\s]*infinitiv/i.test(cleanText) || /entschlie(ß|ss)en.{0,10}zu|zu\+?infinitiv/i.test(cleanText)) {
    return "grammar_structure";
  }

  // 5. Genuine fixed lexical collocation/idiom, explicitly marked (تعبير
  // ثابت / تركيب ثابت / اصطلاحي, excluding the "stable state" false-
  // positive sense of ثابت already stripped above) -- checked BEFORE the
  // closed-class conjunction lookup below, so a phrase like "es tut mir
  // leid, dass..." (a real fixed formula) stays fixed_expression even
  // though its gap answer happens to be the conjunction word "dass".
  if (/ثابت|اصطلاحي/.test(cleanText)) return "fixed_expression";

  // 5. Closed-class subordinating/coordinating conjunctions and indirect-
  // question interrogatives -- direct lookup (checked against the full
  // keyword too, for space-separated multi-word forms like "so dass").
  const kwLower = rawKeyword.toLowerCase();
  if (SUBORDINATING_CONJUNCTIONS.has(bareWord) || COORDINATING_CONNECTORS.has(bareWord) || SUBORDINATING_CONJUNCTIONS.has(kwLower)) return "conjunction";
  if (INTERROGATIVES.has(bareWord) && /استفهام|سؤال/.test(cleanText)) return "conjunction";

  // 6. Separable-verb prefix ("vorschlagen" -> answer "vor") -- explicitly
  // named as such in the original text; must be checked before the bare-
  // preposition rule below, since the prefix word overlaps the preposition
  // word list (vor, an, auf...) but is not a preposition here.
  if (/فعل مركب منفصل|فعل منفصل/.test(cleanText)) return "verb";

  // 7. Relative/personal/reflexive pronoun -- direct lookup on EVERY word of
  // the keyword (catches fused prep+pronoun forms like "in dem"), checked
  // before the bare-preposition rule so an incidental nearby preposition
  // mention in the explanation doesn't steal a genuine pronoun gap.
  if (words.some((w) => PRONOUNS.has(w)) && /ضمير/.test(cleanText)) return "pronoun";

  // 8. Bare preposition, not verb-governed (case-governing preposition
  // alone: während + Genitiv, in Höhe von, etc.) -- strict membership only,
  // no loose "mentions حرف الجر somewhere" fallback (found this session:
  // that fallback pulled in a plain noun and a verb participle that just
  // happened to be discussed near an unrelated preposition).
  if (PREPOSITIONS.includes(bareWord)) return "preposition";

  // 10. Tense/mood/voice, only when the answer itself plausibly IS a verb
  // form (conjugated/participle-shaped: contains a typical verb ending) --
  // guards against an incidental "Konjunktiv"/tense mention elsewhere in
  // the explanation stealing a non-verb answer (e.g. the interrogative
  // "wie" in a sentence that also happens to discuss Konjunktiv II).
  if (/Perfekt|Präteritum|Futur|Konjunktiv|Passiv|Zustandspassiv|Vorgangspassiv|زمن الفعل|المبني للمجهول|صيغة الفعل/.test(text)
    && /^(ge)?[a-zäöüß]+(e|est|st|et|t|en|te|test|ten|tet)$/i.test(bareWord)) {
    return "tense";
  }

  // 11. Adjective/adverb choice or declension.
  if (/صفة|ظرف/.test(cleanText)) return "adjective_adverb";

  // 12. Noun gender/case/declension fact.
  if (/اسم\b|الاسم\b/.test(cleanText)) return "noun";

  // 13. Word order / general sentence structure, explicitly named --
  // checked before the generic verb fallback so e.g. "Verbletztstellung"
  // (a word-order label, not a verb-meaning question) routes correctly
  // even though its explanation necessarily also mentions فعل.
  if (/ترتيب|Verbletztstellung|Wortstellung|Endstellung/.test(cleanText)) return "grammar_structure";

  // 14. Verb meaning/form (spelling, base-form choice) not already caught
  // above -- requires the answer word itself to actually look verb-shaped
  // (infinitive/conjugated/participle ending), not just an incidental فعل
  // mention elsewhere in the explanation (found this session: "anlässlich",
  // "der Besuch", and a preposition+noun-gender fact all false-matched
  // "verb" off a verb mentioned in passing about a DIFFERENT word in the
  // same sentence).
  if (/فعل/.test(cleanText) && /^(ge)?[a-zäöüß]+(e|est|st|et|t|en|te|test|ten|tet)$/i.test(bareWord)) return "verb";

  // 15. Fallback: general sentence-structure pattern.
  return "grammar_structure";
}

async function main() {
  const originalRows = JSON.parse(readFileSync("scripts/learning-aids/_sb_full_dump.json", "utf8"));
  const originalById = new Map(originalRows.map((r) => [r.id, r]));

  const currentRows = await q("select id, title, teil, learning_aids from sb_exercises where learning_aids is not null order by teil, title;");
  console.log(`Loaded ${currentRows.length} exercises (current state).`);

  const updates = [];
  const review = [];
  const counts = {};

  for (const row of currentRows) {
    const original = originalById.get(row.id);
    const items = row.learning_aids?.items || {};
    const newItems = {};
    for (const [gap, item] of Object.entries(items)) {
      const originalItem = original?.items?.[gap];
      const itemType = originalItem ? classify(originalItem, item.keyword) : "grammar_structure";
      counts[itemType] = (counts[itemType] || 0) + 1;
      const { merke_type, ...rest } = item; // drop the superseded field
      newItems[gap] = { ...rest, item_type: itemType };
      review.push({ title: row.title, teil: row.teil, gap, keyword: item.keyword, item_type: itemType });
    }
    updates.push({ id: row.id, title: row.title, learning_aids: { ...row.learning_aids, items: newItems } });
  }

  console.log("Counts by category:", JSON.stringify(counts, null, 2));
  writeFileSync("scripts/learning-aids/_sb_item_type_review.json", JSON.stringify(review, null, 2));
  console.log("Review file: scripts/learning-aids/_sb_item_type_review.json");

  if (!APPLY) {
    console.log("\n(dry run — pass --apply to write to the DB)");
    return;
  }

  const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
  const BATCH = 10;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    const stmts = chunk.map((u) => {
      const jsonStr = JSON.stringify(u.learning_aids);
      return `update sb_exercises set learning_aids = convert_from(decode('${b64(jsonStr)}','base64'),'UTF8')::jsonb where id = '${u.id}';`;
    }).join("\n");
    await q(stmts);
    done += chunk.length;
    console.log(`  ${done}/${updates.length} written`);
  }
  console.log(`Done: ${updates.length} exercises updated.`);
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

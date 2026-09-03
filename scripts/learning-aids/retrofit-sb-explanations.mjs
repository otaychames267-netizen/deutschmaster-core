/**
 * Retrofits every sb_exercises.learning_aids item (T1 + T2, ~1199 gaps) to
 * the new simplified 3-part template: a 1-sentence "Warum ist richtig" rule,
 * a bold-marked evidence quote, and a clean MERKE formula. Reuses the
 * EXISTING, already-reviewed content rather than re-deriving German
 * grammar analysis from scratch:
 *
 *   - explanation_correct/explanation_wrong -> the trailing "المحفز النحوي:
 *     ..." sentence already embedded in the old dense explanation (1198/1199
 *     gaps have it) — that sentence was already written as a clean, single-
 *     sentence rule statement, just buried at the end of a longer paragraph.
 *   - keyword (MERKE formula) -> the part after the last ":" in the old
 *     grammar_structure field (1195/1199 have this), e.g. "auf den Punkt
 *     bringen" instead of the old bare word/Arabic-label+formula mix.
 *   - evidence_text bolding -> T2 already hand-marks the answer in ALL-CAPS
 *     within the quote (588/610 T2 gaps) as an ad-hoc highlight convention;
 *     this converts that to real **bold** with correct German casing
 *     (lowercase unless sentence-initial or found capitalized in the
 *     formula text, which already carries correct noun casing). T1 quotes
 *     are already properly cased, so those get a direct case-sensitive
 *     (falling back to case-insensitive) substring wrap instead.
 *
 * Dry run by default (writes a review file, touches no DB row). Pass
 * --apply to actually write. Usage:
 *   node scripts/learning-aids/retrofit-sb-explanations.mjs [--apply]
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

const TRIGGER = "المحفز النحوي";

function extractRule(explanationCorrect) {
  const idx = explanationCorrect.lastIndexOf(TRIGGER);
  if (idx === -1) return null;
  let rest = explanationCorrect.slice(idx + TRIGGER.length).replace(/^[:\uFF1A\s]+/, "").trim();
  if (rest && !/[.!؟?]$/.test(rest)) rest += ".";
  return rest || null;
}

function extractFormula(grammarStructure, fallbackKeyword) {
  if (!grammarStructure) return fallbackKeyword || null;
  const idx = grammarStructure.lastIndexOf(":");
  const formula = idx === -1 ? grammarStructure.trim() : grammarStructure.slice(idx + 1).trim();
  return formula || fallbackKeyword || null;
}

/** Lowercase a German word UNLESS it looks like it should stay capitalized:
 * we don't try to be a full German grammar engine here — we cross-check
 * against the alreadyproperly-cased `formula` text (which contains real
 * nouns capitalized correctly) and otherwise default lowercase (correct for
 * the common case: verbs, prepositions, adverbs, pronouns — the majority of
 * flagged gap-fill answers), only keeping/adding a capital when the word is
 * the literal first token of the whole sentence. */
function properCase(word, formulaText, isSentenceStart) {
  const lower = word.toLowerCase();
  if (formulaText) {
    const m = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i").exec(formulaText);
    if (m) return isSentenceStart ? m[1][0].toUpperCase() + m[1].slice(1) : m[1];
  }
  return isSentenceStart ? lower[0].toUpperCase() + lower.slice(1) : lower;
}

/** Bold the answer inside evidence_text. Two source conventions:
 *   "caps"  — T2: the answer already appears as an ALL-CAPS run; convert
 *             each run to properly-cased **bold**.
 *   "plain" — T1: the answer appears in normal (already correct) casing;
 *             wrap the first case-sensitive (fallback case-insensitive)
 *             occurrence in **bold**. Handles the "a...b" two-part
 *             connector case (e.g. "zwar...aber") by bolding both parts.
 */
function boldEvidence(evidenceText, rawKeyword, formulaText) {
  if (!evidenceText || !rawKeyword) return { text: evidenceText, method: "none", ok: !!evidenceText };
  const parts = rawKeyword.split(/\.\.\.\s*/).map((p) => p.trim()).filter(Boolean);
  const isAllCapsKw = rawKeyword === rawKeyword.toUpperCase() && rawKeyword !== rawKeyword.toLowerCase();

  if (isAllCapsKw && parts.length === 1) {
    // Not \b...\b: JS \w excludes German umlauts (Ü/Ö/Ä/ß), so a boundary
    // check anchored on \w silently fails to match words like "ÜBERNEHMEN"
    // (real bug, found and fixed this run — see the 5 "caps-nomatch"
    // failures in the first dry-run pass). A German-letter-aware negative
    // lookaround boundary instead.
    const LETTER = "A-Za-zÀ-ÖØ-öø-ÿ";
    const re = new RegExp(`(?<![${LETTER}])${rawKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![${LETTER}])`);
    const m = re.exec(evidenceText);
    if (!m) return { text: evidenceText, method: "caps-nomatch", ok: false };
    const isStart = m.index === 0 || /[.!?]\s*$/.test(evidenceText.slice(0, m.index));
    const cased = properCase(m[0], formulaText, isStart);
    return { text: evidenceText.slice(0, m.index) + `**${cased}**` + evidenceText.slice(m.index + m[0].length), method: "caps", ok: true };
  }

  let text = evidenceText;
  let anyMatch = false;
  for (const part of parts) {
    if (!part) continue;
    let idx = text.indexOf(part);
    let matched = part;
    if (idx === -1) {
      const lowerIdx = text.toLowerCase().indexOf(part.toLowerCase());
      if (lowerIdx !== -1) { idx = lowerIdx; matched = text.slice(lowerIdx, lowerIdx + part.length); }
    }
    if (idx === -1) continue;
    anyMatch = true;
    text = text.slice(0, idx) + `**${matched}**` + text.slice(idx + matched.length);
  }
  return { text, method: parts.length > 1 ? "plain-multi" : "plain", ok: anyMatch };
}

/**
 * Hand-fixed overrides for gaps the mechanical pass can't safely handle,
 * found during review of this run's dry-run output — see the conversation
 * for the full investigation. Two distinct pre-existing bug classes, BOTH
 * already present in the DB before this retrofit (not introduced by it):
 *
 *   1. Duplicated-connector evidence_text (6 gaps): a stray extra copy of
 *      the two-part connector (e.g. "sowohl ... als auch") sits right
 *      before the real sentence, e.g. "...Epochen sowohl ... als auch in
 *      Nord- sowohl ... als auch in Südeuropa angeht." Fixed by removing
 *      the stray duplicate and bolding the real, grammatically-embedded
 *      occurrence.
 *   2. keyword/DB-answer mismatches (6 gaps): the OLD explanation's implied
 *      correct answer doesn't match sb_t1_gaps.correct. Some of these look
 *      like genuine sb_t1_gaps.correct bugs (Daniela/30, Kolleginnen/27 —
 *      the old explanation's grammar is right and the DB answer key looks
 *      wrong), flagged separately to the user, NOT resolved here — this
 *      retrofit only fixes the explanation FORMAT/text to be internally
 *      consistent with whichever answer the old content already argued for,
 *      it does not change sb_t1_gaps.correct (a scoring-affecting change
 *      that needs an explicit decision, not a silent fix).
 */
const MANUAL_EVIDENCE_OVERRIDES = {
  "Frau Stein ( Neu )|23": "Die Veranstaltung beinhaltet **sowohl** Vorträge **als auch** Workshops und Diskussionsforen und dauert von 9 Uhr bis 18 Uhr.",
  "Herr Dr. Dobromil|29": "Aufgrund meiner Berufserfahrung und meines Studiums konnte ich umfangreiche Kenntnisse erwerben, was Möbelstile und die Herstellungskunst in den verschiedensten Epochen **sowohl** in Nord- **als auch** in Südeuropa angeht.",
  "Herr Dr. Moosberger|29": "Während meiner Berufstätigkeit und meines Studiums konnte ich umfangreiche Kenntnisse erwerben, was Möbelstile und die Herstellungskunst in den verschiedensten Epochen **sowohl** in Nord- **als auch** in Südeuropa angeht.",
  "Liebe Agnieszka|24": "Ihre Vertretung, Frau Eichhorn, ist **zwar** sehr nett, **aber** sie hat gerade erst mit dem Unterrichten angefangen und noch keine Erfahrung.",
  "Lieber Thomas|25": "**Einerseits** war ich ziemlich aufgeregt, **andererseits** habe ich mich auch unheimlich gefreut.",
  "Ramon|25": "**Einerseits** war ich ziemlich aufgeregt, **andererseits** habe ich mich auch unheimlich gefreut.",
  "Daniela|30": "Ich bin sicher, dass wir **uns** auf dem Wochenende einigen können.",
  "Jutta|28": "Einige Behandlungen sind schon **hinter** mir und sie scheinen wirksam zu sein.",
  "Karin (معدل)|d31dcea7-19f0-40a4-98b8-125526b1b7be|28": "Das freut mich wirklich für **euch**!",
  "Kolleginnen und Kollegen ( Neu )|27": "Wer noch kein Team hat, kann **sich** bei Frau Maier (Durchwahl 1245) melden.",
  "Leon|29": "Ich bin froh, dass wir für die kommenden Wochenenden **noch** keine Pläne haben.",
  "Lina und Florian|26": "Bei einem längeren Rundgang **sind** auch die wunderbare Schlossbibliothek und das Tapetenzimmer zu besichtigen.",
  // Pre-existing truncated evidence_text ("...mit einer FLUT." full stop,
  // sentence cut short) -- real source sentence confirmed via sb_t2_passages
  // ("...mit einer {{31}}. Von Fotos konfrontiert." -- a raw-extraction
  // artifact splitting one sentence in two), reassembled into the one
  // coherent sentence the explanation already describes ("eine Flut von Fotos").
  "Manipulierte Bilder|31": "Im Internet, in sozialen Netzwerken und der Werbung werden wir mit einer **Flut** von Fotos konfrontiert.",
};

/** The one gap (of 1199) whose old explanation_correct never had a
 * "المحفز النحوي" trigger sentence to extract a compressed rule from (see
 * dry-run stats) -- manually compressed here to the same 1-sentence
 * standard as everything else. */
const MANUAL_RULE_OVERRIDES = {
  "Allein das Wort „Museum“ ist schon fad|31": "الفعل \"bringen\" يحكم التعبير الاسمي الثابت \"auf den Punkt\"، الذي يعني تلخيص شيء بدقة وإيجاز.",
};

/** Flags surfaced to the operator, not auto-applied: sb_t1_gaps.correct
 * looks WRONG relative to the old (grammatically-argued) explanation for
 * these two gaps — a real scoring-affecting bug candidate, separate from
 * this format-only retrofit. */
const SUSPECTED_ANSWER_KEY_BUGS = [
  { title: "Daniela", gap: "30", dbCorrect: "sich (option c)", explanationSays: "uns (option b)", why: "\"sich\" is 3rd-person reflexive; subject is \"wir\" (1st plural), which grammatically requires \"uns\", not \"sich\"." },
  { title: "Kolleginnen und Kollegen ( Neu )", gap: "27", dbCorrect: "ihn (option b)", explanationSays: "sich (option c)", why: "\"sich melden bei\" is the standard reflexive idiom fitting subject \"wer\"; \"ihn\" has no clear referent (\"Team\" is neuter, das Team, so \"ihn\" doesn't even agree in gender)." },
];

async function main() {
  const rows = await q("select id, title, teil, learning_aids from sb_exercises where learning_aids is not null order by teil, title;");
  console.log(`Loaded ${rows.length} exercises.`);

  const updates = [];
  const review = [];
  const failures = [];
  let totalGaps = 0;

  for (const row of rows) {
    const items = row.learning_aids?.items || {};
    const newItems = {};
    for (const [gap, item] of Object.entries(items)) {
      totalGaps++;
      const overrideKey = `${row.title}|${row.id}|${gap}`;
      const simpleKey = `${row.title}|${gap}`;
      const rule = MANUAL_RULE_OVERRIDES[simpleKey]
        ?? extractRule(item.explanation_correct || "")
        ?? (item.explanation_correct || "").trim();
      const formula = extractFormula(item.grammar_structure, item.keyword);
      const override = MANUAL_EVIDENCE_OVERRIDES[overrideKey] ?? MANUAL_EVIDENCE_OVERRIDES[simpleKey];
      const { text: newEvidence, method, ok } = override
        ? { text: override, method: "manual-override", ok: true }
        : boldEvidence(item.evidence_text, (item.keyword || "").trim(), formula);

      newItems[gap] = {
        ...item,
        explanation_correct: rule,
        explanation_wrong: rule,
        keyword: formula,
        grammar_structure: null,
        evidence_text: newEvidence,
      };

      if (!ok) failures.push({ title: row.title, teil: row.teil, gap, keyword: item.keyword, evidence_text: item.evidence_text });
      review.push({ title: row.title, teil: row.teil, gap, rule, formula, evidence: newEvidence, method });
    }
    updates.push({ id: row.id, title: row.title, items: newItems, learning_aids: { ...row.learning_aids, items: newItems } });
  }

  console.log(`Total gaps: ${totalGaps}`);
  console.log(`Bold-match failures (left unbolded, need manual fix): ${failures.length}`);
  writeFileSync("scripts/learning-aids/_sb_retrofit_review.json", JSON.stringify(review, null, 2));
  writeFileSync("scripts/learning-aids/_sb_retrofit_failures.json", JSON.stringify(failures, null, 2));
  console.log("Review file: scripts/learning-aids/_sb_retrofit_review.json");
  console.log("Failures file: scripts/learning-aids/_sb_retrofit_failures.json");

  // Method breakdown, for a quick sanity read.
  const methodCounts = {};
  for (const r of review) methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
  console.log("Method breakdown:", methodCounts);

  console.log("\n=== SUSPECTED sb_t1_gaps.correct BUGS (NOT auto-fixed, flagging only) ===");
  for (const b of SUSPECTED_ANSWER_KEY_BUGS) {
    console.log(`  ${b.title} / gap ${b.gap}: DB says "${b.dbCorrect}", old explanation argues "${b.explanationSays}" -- ${b.why}`);
  }

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

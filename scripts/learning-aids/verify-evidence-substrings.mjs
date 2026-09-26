/**
 * Phase 6 verification: HighlightedText matches evidence_text against its
 * source text via plain indexOf, so every evidence_text must be a genuine,
 * verbatim (case-sensitive) substring of the real passage/statement/ad text
 * it's supposed to point to. This walks every populated learning_aids item
 * across Hören T1-T3, Sprachbausteine T1-T2, and Lesen T1-T3, and reports
 * any evidence_text that can't be found — never mutates anything.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const issues = [];
let checked = 0;

// Mirrors HighlightedText.tsx's matching exactly: exact substring first,
// then a whitespace-collapsed fallback (PDF-derived source text keeps its
// original line-wrap \n's where a naturally-authored sentence has spaces).
function normalizeForMatch(s) {
  return s.replace(/\s+/g, " ");
}

function isSubstringTolerant(sourceText, evidenceText) {
  if (sourceText.includes(evidenceText)) return true;
  return normalizeForMatch(sourceText).includes(normalizeForMatch(evidenceText));
}

function checkItem(context, evidenceText, sourceText) {
  if (!evidenceText) return;
  checked++;
  if (!sourceText) {
    issues.push({ ...context, problem: "no source text found for this item" });
    return;
  }
  if (!isSubstringTolerant(sourceText, evidenceText)) {
    issues.push({ ...context, problem: "evidence_text not found (even whitespace-tolerant)", evidenceText });
  }
}

// ── Hören T1/T2/T3 — evidence lives inside the statement's own text ──
{
  const { data: exercises } = await supabase.from("hoeren_exercises").select("id, title, teil, learning_aids").not("learning_aids", "is", null);
  for (const ex of exercises ?? []) {
    const items = ex.learning_aids?.items ?? {};
    const { data: statements } = await supabase.from("hoeren_statements").select("statement_number, statement_text").eq("exercise_id", ex.id);
    const byNum = Object.fromEntries((statements ?? []).map((s) => [String(s.statement_number), s.statement_text]));
    for (const [key, item] of Object.entries(items)) {
      checkItem({ skill: "hoeren", teil: ex.teil, exercise: ex.title, id: ex.id, item: key }, item.evidence_text, byNum[key]);
    }
  }
}

// Sprachbausteine T1/T2 are deliberately NOT checked here: their
// evidence_text is authored as a complete illustrative sentence with the
// gap already filled in (e.g. "anbei erhalten Sie..."), never a literal
// quote of the raw passage (which still has the {{N}} gap marker in that
// spot). SB never renders HighlightedText against the passage — EvidenceBlock
// shows evidence_text as its own quoted line — so there is nothing to verify.

// ── Lesen T1 — evidence lives inside that text's own content ──
{
  const { data: exercises } = await supabase.from("lesen_exercises").select("id, title, learning_aids").eq("teil", 1).not("learning_aids", "is", null);
  for (const ex of exercises ?? []) {
    const items = ex.learning_aids?.items ?? {};
    const { data: texts } = await supabase.from("lesen_t1_texts").select("position, content").eq("exercise_id", ex.id);
    const byPos = Object.fromEntries((texts ?? []).map((t) => [String(t.position), t.content]));
    for (const [key, item] of Object.entries(items)) {
      checkItem({ skill: "lesen", teil: 1, exercise: ex.title, id: ex.id, item: key }, item.evidence_text, byPos[key]);
    }
  }
}

// ── Lesen T2 — evidence lives inside the shared passage ──
{
  const { data: exercises } = await supabase.from("lesen_exercises").select("id, title, learning_aids").eq("teil", 2).not("learning_aids", "is", null);
  for (const ex of exercises ?? []) {
    const items = ex.learning_aids?.items ?? {};
    const { data: passageRow } = await supabase.from("lesen_t2_passages").select("passage").eq("exercise_id", ex.id).maybeSingle();
    for (const [key, item] of Object.entries(items)) {
      checkItem({ skill: "lesen", teil: 2, exercise: ex.title, id: ex.id, item: key }, item.evidence_text, passageRow?.passage);
    }
  }
}

// ── Lesen T3 — evidence lives inside the ad text matching that situation's
//    correct letter, not a shared passage ──
{
  const { data: exercises } = await supabase.from("lesen_exercises").select("id, title, learning_aids").eq("teil", 3).not("learning_aids", "is", null);
  for (const ex of exercises ?? []) {
    const items = ex.learning_aids?.items ?? {};
    const { data: situations } = await supabase.from("lesen_t3_situations").select("number, correct_letter").eq("exercise_id", ex.id);
    const { data: texts } = await supabase.from("lesen_t3_texts").select("letter, content").eq("exercise_id", ex.id);
    const letterToContent = Object.fromEntries((texts ?? []).map((t) => [t.letter, t.content]));
    const numToLetter = Object.fromEntries((situations ?? []).map((s) => [String(s.number), s.correct_letter]));
    for (const [key, item] of Object.entries(items)) {
      const letter = numToLetter[key];
      checkItem({ skill: "lesen", teil: 3, exercise: ex.title, id: ex.id, item: key }, item.evidence_text, letter ? letterToContent[letter] : null);
    }
  }
}

console.log(`Checked ${checked} evidence_text items across all skills.`);
console.log(`${issues.length} issue(s) found.`);
for (const i of issues) console.log(JSON.stringify(i));

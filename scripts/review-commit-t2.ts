/**
 * review-commit-t2.ts — STAGE 3/4 for Lesen Teil 2.
 *
 * Reads the per-exercise extraction artifact, validates every exercise against
 * the TELC rules, applies duplicate-title version numbering (keeping ALL
 * versions), and prints a full transparency report (the review gate).
 *
 * Default = REVIEW ONLY (no DB writes).
 * With --commit = delete existing T2 exercises and insert the VALID ones.
 *
 * Usage:
 *   tsx scripts/review-commit-t2.ts <artifactName>            # review only
 *   tsx scripts/review-commit-t2.ts <artifactName> --commit   # write to DB
 */
import "dotenv/config";
import { readFile } from "fs/promises";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const CACHE_DIR = "scripts/.extract-cache";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const IMPORT_USER = "df47fbfc-7895-4941-864a-5d1d8f4fdc30";

interface RawExercise {
  title: string | null;
  article: string | null;
  questions: Array<{ number: number; text: string; option_a: string; option_b: string; option_c: string }>;
  answer_key: Array<{ number: number; answer: string }>;
  notes?: string | null;
  _pages?: number[];
}

interface Validated extends RawExercise {
  index: number;
  finalTitle: string;
  valid: boolean;
  flags: string[];
}

// Detect transcription glitches that signal an imperfect extraction:
// alternate-reading artifacts, duplicated phrases, broken fragments.
function detectGlitches(text: string | null | undefined): string[] {
  const g: string[] = [];
  if (!text) return g;
  const t = text.trim();
  // "Oder (...)" / "oder (...)" alternate-reading artifact the model sometimes adds
  if (/\b[Oo]der\s*\(/.test(t)) g.push("alternate_reading");
  if (/\(\s*(?:oder|bzw|alt|or)\b/i.test(t)) g.push("alternate_paren");
  // Immediate duplicated word/short-phrase, e.g. "Schweden in Schweden"
  if (/\b(\w{3,}(?:\s+\w+){0,2})\s+\1\b/i.test(t)) g.push("duplicated_phrase");
  // Broken OCR fragment: word ending in hyphen-comma or dangling dash
  if (/\w-[,.]/.test(t) || /\s-\s*["„]/.test(t)) g.push("broken_fragment");
  return g;
}

function validate(ex: RawExercise, index: number): Validated {
  const flags: string[] = [];
  const title = (ex.title ?? "").trim();
  if (!title) flags.push("no_title");
  if (!ex.article || ex.article.trim().length < 150) flags.push("article_missing_or_short");

  // Glitch detection across article + all option texts.
  // HARD glitches (duplicated_phrase, broken_fragment) reject; SOFT ones
  // (alternate_reading/paren) only warn, since the alternate may be genuinely
  // printed in the booklet (verified by eye) — PDF is the source of truth.
  const SOFT = new Set(["alternate_reading", "alternate_paren"]);
  const hard: string[] = [];
  const warns: string[] = [];
  const scan = (label: string, txt: string | null | undefined) => {
    for (const gg of detectGlitches(txt)) (SOFT.has(gg) ? warns : hard).push(`${label}:${gg}`);
  };
  scan("article", ex.article);
  for (const q of ex.questions ?? []) {
    scan(`q${q.number}.a`, q.option_a); scan(`q${q.number}.b`, q.option_b);
    scan(`q${q.number}.c`, q.option_c); scan(`q${q.number}.text`, q.text);
  }
  if (hard.length) flags.push(`glitch(${hard.slice(0, 5).join(",")})`);
  (ex as any)._warnings = warns;

  const qs = [...(ex.questions ?? [])].sort((a, b) => a.number - b.number);
  if (qs.length !== 5) flags.push(`expected_5_questions_got_${qs.length}`);
  for (const q of qs) {
    if (!q.option_a?.trim() || !q.option_b?.trim() || !q.option_c?.trim()) flags.push(`q${q.number}_missing_option`);
    if (!q.text?.trim()) flags.push(`q${q.number}_missing_text`);
  }
  const key = ex.answer_key ?? [];
  if (key.length === 0) flags.push("no_answer_key");
  for (const q of qs) {
    const a = key.find((k) => k.number === q.number);
    if (!a) flags.push(`key_missing_q${q.number}`);
    else if (!["a", "b", "c"].includes(String(a.answer).toLowerCase())) flags.push(`key_invalid_q${q.number}`);
  }

  return { ...ex, index, finalTitle: title, valid: flags.length === 0, flags };
}

function numberDuplicateTitles(list: Validated[]) {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const counts = new Map<string, number>();
  for (const e of list) if (e.finalTitle) counts.set(norm(e.finalTitle), (counts.get(norm(e.finalTitle)) ?? 0) + 1);
  const running = new Map<string, number>();
  for (const e of list) {
    if (!e.finalTitle) continue;
    const k = norm(e.finalTitle);
    if ((counts.get(k) ?? 0) > 1) {
      const n = (running.get(k) ?? 0) + 1;
      running.set(k, n);
      e.finalTitle = `${e.finalTitle} ${n}`;
    }
  }
}

async function main() {
  const name = process.argv[2];
  const commit = process.argv.includes("--commit");
  if (!name) { console.error("usage: review-commit-t2.ts <artifactName> [--commit]"); process.exit(1); }

  const artifact = path.join(CACHE_DIR, `${name}.exercises.json`);
  const raw: Record<string, RawExercise> = JSON.parse(await readFile(artifact, "utf8"));
  const list = Object.entries(raw)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([idx, ex]) => validate(ex, parseInt(idx)));
  numberDuplicateTitles(list);

  const valid = list.filter((e) => e.valid);
  const rejected = list.filter((e) => !e.valid);

  // ── Transparency report ──
  console.log(`\n══════════ LESEN TEIL 2 — REVIEW REPORT (${name}) ══════════`);
  console.log(`Total exercises extracted : ${list.length}`);
  console.log(`  ✓ valid (importable)    : ${valid.length}`);
  console.log(`  ✗ rejected/flagged      : ${rejected.length}`);

  // duplicate-title groups
  const groups = new Map<string, Validated[]>();
  for (const e of list) {
    const base = e.finalTitle.replace(/\s+\d+$/, "").trim() || "(untitled)";
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base)!.push(e);
  }
  const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1);
  console.log(`\nDuplicate-title groups (kept as versions): ${dupGroups.length}`);
  for (const [base, v] of dupGroups) console.log(`   • ${base} → ${v.length} versions`);

  console.log(`\n── VALID exercises ──`);
  for (const e of valid) console.log(`  [${e.index}] "${e.finalTitle}"  (pages ${e._pages?.join(",")})  ${e.questions.length}q, key ${e.answer_key.length}`);

  if (rejected.length) {
    console.log(`\n── REJECTED / NEEDS REVIEW ──`);
    for (const e of rejected) console.log(`  [${e.index}] title=${JSON.stringify(e.title)} pages=${e._pages?.join(",")} → ${e.flags.join(", ")}`);
  }

  if (!commit) {
    console.log(`\n[review-only] No DB writes. Re-run with --commit to import the ${valid.length} valid exercises.`);
    return;
  }

  // ── Commit ──
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  console.log(`\n── COMMIT: importing ${valid.length} valid exercises ──`);

  // Delete existing T2 exercises (clean re-import)
  const { data: existing } = await db.from("lesen_exercises").select("id").eq("teil", 2);
  for (const ex of existing ?? []) {
    await db.from("lesen_t2_questions").delete().eq("exercise_id", ex.id);
    await db.from("lesen_t2_passages").delete().eq("exercise_id", ex.id);
    await db.from("lesen_exercises").delete().eq("id", ex.id);
  }
  console.log(`  deleted ${existing?.length ?? 0} old T2 exercises`);

  let imported = 0;
  for (const e of valid) {
    const { data: row, error } = await db.from("lesen_exercises")
      .insert({ title: e.finalTitle, teil: 2, created_by: IMPORT_USER, source_pdf: name })
      .select("id").single();
    if (error || !row) { console.error(`  [${e.index}] insert error:`, error?.message); continue; }
    await db.from("lesen_t2_passages").insert({ exercise_id: row.id, title: e.finalTitle, passage: e.article });
    await db.from("lesen_t2_questions").insert(e.questions.map((q) => ({
      exercise_id: row.id,
      number: q.number,
      question: q.text,
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c,
      correct: String(e.answer_key.find((k) => k.number === q.number)!.answer).toLowerCase(),
    })));
    imported++;
    console.log(`  ✓ [${e.index}] "${e.finalTitle}"`);
  }
  console.log(`\nDone. Imported ${imported}/${valid.length} exercises.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

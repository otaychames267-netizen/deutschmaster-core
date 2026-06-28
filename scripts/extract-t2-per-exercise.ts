/**
 * extract-t2-per-exercise.ts — OCR classifies page roles (free) → group into
 * exercises → ONE Gemini call per exercise for verbatim extraction.
 *
 * Modes:
 *   --roles-only : only run free OCR role classification + print grouping (no Gemini)
 *   (default)    : roles + one Gemini extraction per exercise
 *
 * READ-ONLY: writes only local JSON artifacts. No database.
 *
 * Usage: tsx scripts/extract-t2-per-exercise.ts "<pdf>" <outName> [maxPages] [--roles-only]
 */
import "dotenv/config";
import { writeFile, readFile, mkdir } from "fs/promises";
import * as path from "path";
import { getPageCount, extractPageImagePng, extractT2Exercise } from "../src/lib/import/gemini-vision.js";
import { withWatchdog } from "../src/lib/import/progress.js";
import { classifyPageRole, terminateOcr, type PageRoleInfo } from "../src/lib/import/ocr-extract.js";

const CACHE_DIR = "scripts/.extract-cache";
const DELAY_MS = parseInt(process.env.GEMINI_DELAY_MS ?? "4500");

async function loadJson<T>(f: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(f, "utf8")); } catch { return fallback; }
}
async function saveJson(f: string, obj: any) { await mkdir(path.dirname(f), { recursive: true }); await writeFile(f, JSON.stringify(obj, null, 2)); }

interface ExerciseGroup { index: number; articlePages: number[]; questionPages: number[]; allPages: number[]; }

function groupIntoExercises(roles: PageRoleInfo[]): ExerciseGroup[] {
  const sorted = [...roles].sort((a, b) => a.page - b.page);
  const groups: ExerciseGroup[] = [];
  let cur: ExerciseGroup | null = null;
  for (const r of sorted) {
    if (r.role === "article") {
      if (cur) groups.push(cur);
      cur = { index: groups.length + 1, articlePages: [r.page], questionPages: [], allPages: [r.page] };
    } else if (r.role === "questions") {
      if (!cur) cur = { index: groups.length + 1, articlePages: [], questionPages: [], allPages: [] };
      cur.questionPages.push(r.page); cur.allPages.push(r.page);
    } else {
      // "other" — attach to current exercise so nothing is lost
      if (cur) { cur.allPages.push(r.page); }
    }
  }
  if (cur) groups.push(cur);
  return groups;
}

async function main() {
  const args = process.argv.slice(2);
  const rolesOnly = args.includes("--roles-only");
  const positional = args.filter((a) => !a.startsWith("--"));
  const pdfPath = positional[0];
  const outName = positional[1] ?? "t2_perex";
  const maxPages = positional[2] ? parseInt(positional[2]) : 0;
  if (!pdfPath) { console.error("usage: extract-t2-per-exercise.ts <pdf> <outName> [maxPages] [--roles-only]"); process.exit(1); }

  const total = maxPages || await getPageCount(pdfPath);
  const rolesFile = path.join(CACHE_DIR, `${outName}.roles.json`);
  const exFile = path.join(CACHE_DIR, `${outName}.exercises.json`);

  // ── Phase 1: OCR role classification (free, cached) ──
  const roleCache: Record<number, PageRoleInfo> = await loadJson(rolesFile, {});
  const roles: PageRoleInfo[] = [];
  console.log(`PDF: ${pdfPath}\nPages: ${total}\n── Phase 1: OCR role classification (free) ──`);
  for (let p = 1; p <= total; p++) {
    if (roleCache[p]) { roles.push(roleCache[p]); continue; }
    const info = await classifyPageRole(pdfPath, p);
    roleCache[p] = info; roles.push(info);
    console.log(`  page ${p}: ${info.role.padEnd(9)} conf=${info.confidence.toFixed(0)} [${info.signals.join(", ")}]`);
    if (p % 5 === 0) await saveJson(rolesFile, roleCache);
  }
  await saveJson(rolesFile, roleCache);
  await terminateOcr();

  // ── Group into exercises ──
  const groups = groupIntoExercises(roles);
  console.log(`\n── Grouping → ${groups.length} exercises ──`);
  for (const g of groups) console.log(`  Exercise ${g.index}: article p${g.articlePages.join(",")} + questions p${g.questionPages.join(",")}${g.allPages.length > g.articlePages.length + g.questionPages.length ? " (+other)" : ""}`);

  const roleSummary = roles.reduce((m: any, r) => { m[r.role] = (m[r.role] ?? 0) + 1; return m; }, {});
  console.log(`\nRole counts:`, roleSummary);

  if (rolesOnly) { console.log(`\n[roles-only] stopping before Gemini. Roles artifact: ${rolesFile}`); return; }

  // ── Phase 2: one Gemini call per exercise ──
  console.log(`\n── Phase 2: Gemini extraction (1 call per exercise) ──`);
  const exCache: Record<number, any> = await loadJson(exFile, {});
  // A cached entry is reusable only if it has real content; error/empty entries are retried.
  const good = (e: any) => e && (e.title || (e.questions && e.questions.length));
  let done = 0, quotaHit = false;
  for (const g of groups) {
    if (good(exCache[g.index])) { console.log(`  ex ${g.index}: cached`); continue; }
    if (done > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    done++;
    const pagesForGemini = [...new Set([...g.articlePages, ...g.questionPages, ...g.allPages])].sort((a, b) => a - b);
    try {
      const imgs: string[] = [];
      for (const pg of pagesForGemini) {
        const png = await withWatchdog(`ex${g.index} image p${pg}`, 25000, () => extractPageImagePng(pdfPath, pg));
        imgs.push(png.toString("base64"));
      }
      const ex = await withWatchdog(`ex${g.index} gemini`, 35000, (signal) => extractT2Exercise(imgs, undefined, signal));
      exCache[g.index] = { ...ex, _pages: pagesForGemini };
      const nq = ex.questions?.length ?? 0, nk = ex.answer_key?.length ?? 0;
      console.log(`  ex ${g.index} (p${pagesForGemini.join(",")}): title=${JSON.stringify(ex.title)} ${nq}q KEY${nk}`);
      await saveJson(exFile, exCache);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("QUOTA_429")) {
        // Fail fast: daily quota won't clear mid-run. Stop now; remaining stay unextracted for next window.
        console.error(`  ex ${g.index}: QUOTA EXHAUSTED — aborting run (fail-fast). Remaining exercises will retry next quota window.`);
        quotaHit = true; break;
      }
      console.error(`  ex ${g.index}: ERROR ${msg.slice(0, 140)}`);
      exCache[g.index] = { title: null, article: null, questions: [], answer_key: [], notes: `error: ${msg.slice(0, 120)}`, _pages: pagesForGemini };
      await saveJson(exFile, exCache);
    }
  }
  if (quotaHit) console.log(`\n⚠ Stopped early on quota. Re-run with a fresh key to continue (cached good exercises are skipped).`);
  await saveJson(exFile, exCache);
  console.log(`\nExercises artifact: ${exFile}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

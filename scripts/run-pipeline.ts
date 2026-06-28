/**
 * run-pipeline.ts — the "launch once" orchestrator.
 *
 * Scans all TELC PDFs, and for each PDF that has a registered extraction adapter:
 *   import drafts → upload page images → validate (deterministic; deep cross-OCR
 *   only on low-confidence) → report → AUTOMATICALLY CONTINUE to the next PDF.
 *
 * Resumable: skips PDFs whose batch is already 'ready'/'committed' unless --revalidate.
 * Fully automated; no manual intervention between PDFs. NOTHING is promoted to
 * live tables — promotion stays in the human review UI.
 *
 * Usage: tsx scripts/run-pipeline.ts [--deep] [--revalidate] [--only "<substr>"]
 */
import "dotenv/config";
import { scanTelcPdfs } from "../src/lib/import/detect.js";
import { ADAPTERS } from "../src/lib/import/adapters.js";
import { adminClient } from "../src/lib/import/storage.js";
import { ensureBatch, writeDraft, setBatchStatus } from "../src/lib/import/staging.js";
import { validateBatch, type BatchValidationSummary } from "../src/lib/import/run-validation.js";

const CACHE_DIR = "scripts/.extract-cache";
const CACHE_MAP: Record<string, string> = { "lesen teil 2 (1).pdf": "t2_pdf1" };
const slug = (n: string) => n.replace(/\.pdf$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

async function main() {
  const args = process.argv.slice(2);
  const deep = args.includes("--deep");
  const revalidate = args.includes("--revalidate");
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

  const db = adminClient();
  const pdfs = await scanTelcPdfs();
  log(`Discovered ${pdfs.length} PDF(s).`);

  const summaries: BatchValidationSummary[] = [];
  const skipped: string[] = [];

  for (const p of pdfs) {
    if (only && !p.fileName.toLowerCase().includes(only.toLowerCase())) continue;
    const key = `${p.section}:${p.teil}`;
    const adapter = p.section && p.teil ? ADAPTERS[key] : undefined;
    if (!adapter) { skipped.push(`${p.fileName} [${key}] — no adapter yet`); continue; }

    const cacheName = CACHE_MAP[p.fileName] ?? slug(p.fileName);
    log(`\n══════ ${p.fileName} [${key}] ══════`);

    // skip if already validated/ready (resume), unless --revalidate
    const { data: existing } = await db.from("import_batches").select("status").eq("source_pdf", p.fileName).eq("section", p.section!).eq("teil", p.teil!).maybeSingle();
    if (existing && ["ready", "committed"].includes((existing as any).status) && !revalidate) { log(`  already ${(existing as any).status} — skipping (use --revalidate to force).`); continue; }

    // 1) extract → drafts
    let drafts;
    try { drafts = await adapter.produce({ pdfPath: p.filePath, pdfName: p.fileName, cacheDir: CACHE_DIR, cacheName }); }
    catch (e) { log(`  extraction not available: ${String(e).slice(0, 120)} — skipping (run extraction first).`); skipped.push(`${p.fileName} — no extraction cache`); continue; }

    // 2) import drafts + page images to staging
    const batch = await ensureBatch(db, { sourcePdf: p.fileName, section: p.section!, teil: p.teil! });
    let written = 0;
    for (const d of drafts) { if ((await writeDraft(db, batch, d, { pdfPath: p.filePath, pdfName: p.fileName, section: p.section!, teil: p.teil! })) === "written") written++; }
    await setBatchStatus(db, batch.id, "extracting", drafts.length);
    log(`  imported ${drafts.length} drafts (${written} new).`);

    // 3) validate
    const sum = await validateBatch(db, p.fileName, { crossPdfPath: deep ? p.filePath : undefined });
    summaries.push(sum);
    log(`  validation: ${sum.passed}/${sum.total} passed, ${sum.reprocess} reprocess, ${sum.duplicatesRemoved} dup removed → ${sum.status}`);
    // auto-continue to next PDF (no manual step)
  }

  // ── Aggregate report ──
  console.log(`\n══════════ PIPELINE SUMMARY ══════════`);
  for (const s of summaries) {
    console.log(`  ${s.sourcePdf}: ${s.passed}/${s.total} passed · reprocess ${s.reprocess} (idx ${s.reprocessIdx.join(",") || "—"}) · dup-removed ${s.duplicatesRemoved} · versioned ${s.versionedDuplicates} · pages[order=${s.pageChecks.ordering?"✓":"✗"},overlap=${s.pageChecks.overlap?"✓":"✗"}] · conf ${s.confidence.toFixed(2)} · ${s.status}`);
  }
  const tot = summaries.reduce((a, s) => ({ t: a.t + s.total, p: a.p + s.passed, r: a.r + s.reprocess, d: a.d + s.duplicatesRemoved }), { t: 0, p: 0, r: 0, d: 0 });
  console.log(`\n  TOTAL: ${tot.p}/${tot.t} passed · ${tot.r} need reprocess · ${tot.d} duplicates removed`);
  if (skipped.length) { console.log(`\n  Skipped (no adapter / no extraction):`); for (const s of skipped) console.log(`    • ${s}`); }
  console.log(`\n  Promotion to live tables remains manual via /admin/import-review (nothing auto-promoted).`);
}
main().catch((e) => { console.error(e); process.exit(1); });

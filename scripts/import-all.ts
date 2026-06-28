/**
 * import-all.ts — generic importer (Milestone 3).
 *
 * Scans the Desktop TELC PDF folders, detects section/Teil for each PDF, and for
 * every PDF that has a registered extraction adapter, writes its exercises as
 * DRAFTS into the staging layer + uploads page images. PDFs without an adapter
 * yet (Teil 1/3 → Milestones 6/7) are detected and logged, not extracted.
 *
 * Resumable & idempotent: batches keyed by (pdf, section, teil); drafts by idx.
 * Re-running skips already-written drafts (use --force to rewrite).
 * NOTHING is promoted to live tables.
 *
 * Usage: tsx scripts/import-all.ts [--force] [--only "<filename substr>"] [--root <desktop>]
 */
import "dotenv/config";
import { scanTelcPdfs } from "../src/lib/import/detect.js";
import { ADAPTERS } from "../src/lib/import/adapters.js";
import { adminClient } from "../src/lib/import/storage.js";
import { ensureBatch, writeDraft, setBatchStatus } from "../src/lib/import/staging.js";

const CACHE_DIR = "scripts/.extract-cache";
// Legacy cache names for already-extracted PDFs (new imports use the file slug).
const CACHE_MAP: Record<string, string> = { "lesen teil 2 (1).pdf": "t2_pdf1" };
const slug = (n: string) => n.replace(/\.pdf$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function log(m: string) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`); }

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
  const root = args.includes("--root") ? args[args.indexOf("--root") + 1] : undefined;

  const db = adminClient();
  const pdfs = await scanTelcPdfs(root);
  log(`Discovered ${pdfs.length} PDF(s) across TELC folders.`);
  for (const p of pdfs) log(`  • ${p.fileName}  →  section=${p.section ?? "?"} teil=${p.teil ?? "?"}`);

  let imported = 0, skipped = 0, noAdapter = 0;
  const report: any[] = [];

  for (const p of pdfs) {
    if (only && !p.fileName.toLowerCase().includes(only.toLowerCase())) continue;
    const key = `${p.section}:${p.teil}`;
    const adapter = p.section && p.teil ? ADAPTERS[key] : undefined;

    if (!adapter) {
      noAdapter++;
      log(`SKIP (no adapter yet) ${p.fileName} [${key}] — extraction pipeline arrives in a later milestone.`);
      report.push({ pdf: p.fileName, section: p.section, teil: p.teil, status: "no_adapter" });
      continue;
    }

    const cacheName = CACHE_MAP[p.fileName] ?? slug(p.fileName);
    log(`\n=== ${p.fileName}  [${key}]  cache=${cacheName} ===`);

    let drafts;
    try {
      drafts = await adapter.produce({ pdfPath: p.filePath, pdfName: p.fileName, cacheDir: CACHE_DIR, cacheName });
    } catch (e) {
      log(`  extraction unavailable: ${String(e).slice(0, 140)}`);
      report.push({ pdf: p.fileName, status: "no_cache" });
      continue;
    }

    const batch = await ensureBatch(db, { sourcePdf: p.fileName, section: p.section!, teil: p.teil!, totalPages: undefined });
    log(`  batch ${batch.id} (status=${batch.status}); ${batch.existingIdx.size} draft(s) already present.`);

    let w = 0, s = 0;
    for (const d of drafts) {
      const r = await writeDraft(db, batch, d, { pdfPath: p.filePath, pdfName: p.fileName, section: p.section!, teil: p.teil! }, force);
      if (r === "written") { w++; log(`  ✓ idx ${d.idx} "${d.title}" (${d.pages.length} pages, structure_ok=${d.structureOk}, coherence=${d.coherence?.toFixed(2)})`); }
      else { s++; }
    }
    await setBatchStatus(db, batch.id, "ready", drafts.length);
    imported += w; skipped += s;
    log(`  → wrote ${w}, skipped ${s} (already present). Batch marked 'ready'.`);
    report.push({ pdf: p.fileName, section: p.section, teil: p.teil, drafts: drafts.length, written: w, skipped: s });
  }

  log(`\n══════ IMPORT SUMMARY ══════`);
  log(`PDFs discovered : ${pdfs.length}`);
  log(`Drafts written  : ${imported}`);
  log(`Drafts skipped  : ${skipped} (already in staging)`);
  log(`No adapter yet  : ${noAdapter} (Teil 1/3 → later milestones)`);
  log(`Live tables touched: NONE (everything is staging, pending manual approval).`);
}

main().catch((e) => { console.error(e); process.exit(1); });

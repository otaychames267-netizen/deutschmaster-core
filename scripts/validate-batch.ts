/**
 * validate-batch.ts — run the multi-check validation over a staged batch and
 * produce a per-PDF validation report. Marks drafts that any check flags as
 * needs_reprocess (written back to staging flags + payload._validation).
 *
 * Independent checks: title, structure, answer_key, article↔question match,
 * text integrity, batch page ordering/overlap/missing, content-based duplicates,
 * and (optional, --cross-ocr) a second independent OCR pass compared to the
 * stored article. If methods disagree or confidence < 0.6 → needs_reprocess.
 *
 * READ-ONLY w.r.t. live tables. Usage:
 *   tsx scripts/validate-batch.ts "<source_pdf>" [--cross-ocr "<pdf path>"]
 */
import "dotenv/config";
import { adminClient } from "../src/lib/import/storage.js";
import { validateExercise, validateBatchPages, detectDuplicates, fingerprintExercise, type ExerciseLike, type Check } from "../src/lib/import/validate.js";
import { ocrArticleTextWith } from "../src/lib/import/ocr-extract.js";
import { mapConcurrent, destroyPool, poolSize } from "../src/lib/import/ocr-pool.js";

const pageNumFromPath = (p: string) => { const m = p.match(/page-(\d+)\.png$/); return m ? parseInt(m[1]) : 0; };

// crude word-set similarity for the cross-OCR check
function sim(a: string, b: string): number {
  const ws = (s: string) => new Set(s.toLowerCase().normalize("NFKD").replace(/[^a-zäöüß ]/g, " ").split(/\s+/).filter((w) => w.length >= 5));
  const A = ws(a), B = ws(b); if (!A.size || !B.size) return 0;
  let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i);
}

async function main() {
  const sourcePdf = process.argv[2];
  const crossIdx = process.argv.indexOf("--cross-ocr");
  const crossPdf = crossIdx >= 0 ? process.argv[crossIdx + 1] : null;
  if (!sourcePdf) { console.error('usage: validate-batch.ts "<source_pdf>" [--cross-ocr "<pdf path>"]'); process.exit(1); }

  const db = adminClient();
  const { data: batch } = await db.from("import_batches").select("*").eq("source_pdf", sourcePdf).maybeSingle();
  if (!batch) { console.error(`No batch for ${sourcePdf}`); process.exit(1); }
  const { data: drafts } = await db.from("import_draft_exercises").select("*").eq("batch_id", (batch as any).id).order("idx");

  const exercises: ExerciseLike[] = (drafts ?? []).map((d: any) => ({
    idx: d.idx, title: d.title, article: d.article,
    pages: (d.page_images ?? []).map(pageNumFromPath).filter(Boolean),
    questions: d.payload?.questions ?? [], answerKey: d.payload?.answer_key ?? [],
  }));

  // ── TIER 1: fast deterministic pass for ALL (no OCR) ──
  const DEEP_THRESHOLD = parseFloat(process.env.DEEP_THRESHOLD ?? "0.85");
  let reports = exercises.map((e) => validateExercise(e));

  // ── TIER 2: deep cross-OCR ONLY for low-confidence / flagged drafts, in PARALLEL ──
  // Cached: reuse a prior cross_ocr_agreement result if the article fingerprint is unchanged.
  const deepIdx = reports
    .map((r, i) => ({ i, deep: crossPdf && (r.needsReprocess || r.minConfidence < DEEP_THRESHOLD) }))
    .filter((x) => x.deep)
    .map((x) => x.i);

  if (crossPdf && deepIdx.length) {
    console.log(`Deep cross-OCR pass on ${deepIdx.length}/${exercises.length} low-confidence drafts (parallel)…`);
    const extraByIdx = new Map<number, Check>();
    await mapConcurrent(deepIdx, async (i, worker) => {
      const e = exercises[i];
      const cached = (drafts ?? [])[i]?.payload?._validation?.checks?.find?.((c: any) => c.name === "cross_ocr_agreement");
      const cachedFp = (drafts ?? [])[i]?.payload?._crossocr_fp;
      const curFp = (drafts ?? [])[i]?.payload?._fingerprint;
      if (cached && cachedFp && cachedFp === curFp) { extraByIdx.set(i, cached); return; } // cache hit — skip OCR
      if (!e.pages[0]) return;
      try {
        const reocr = await ocrArticleTextWith(crossPdf, e.pages[0], worker, 3);
        const s = sim(reocr.text, e.article ?? "");
        extraByIdx.set(i, { name: "cross_ocr_agreement", ok: s >= 0.5, confidence: s, detail: `independent OCR similarity ${s.toFixed(2)}` });
      } catch { /* skip */ }
    });
    await destroyPool();
    // re-validate the deep ones with the extra check folded in
    reports = reports.map((r, i) => extraByIdx.has(i) ? validateExercise(exercises[i], [extraByIdx.get(i)!]) : r);
    console.log(`  (used ${poolSize() || "pooled"} workers)`);
  }

  const pageReport = validateBatchPages(exercises, (batch as any).total_pages ?? undefined);
  const dups = detectDuplicates(exercises);

  // Identical-content duplicates: keep the lowest idx, soft-reject the rest.
  const idxToDraft = new Map((drafts ?? []).map((d: any) => [d.idx, d]));
  const removeIdx = new Set<number>();
  for (const g of dups) { const keep = Math.min(...g.idxs); for (const x of g.idxs) if (x !== keep) removeIdx.add(x); }
  for (const x of removeIdx) {
    const d: any = idxToDraft.get(x); if (!d) continue;
    await db.from("import_draft_exercises").update({ status: "rejected", flags: [...(d.flags ?? []).filter((f: string) => f !== "NEEDS_REPROCESS"), "DUPLICATE_REMOVED"] }).eq("id", d.id);
    await db.from("import_audit_log").insert({ batch_id: (batch as any).id, draft_id: d.id, draft_idx: x, event: "duplicate_removed", reason: "identical article+questions+key to a kept exercise", details: {} });
  }

  // Versioned duplicates: same raw_title, but DIFFERENT fingerprint (kept as versions).
  const byTitle = new Map<string, Set<string>>();
  for (const d of drafts ?? []) {
    const t = (d.raw_title ?? d.title ?? "").trim().toLowerCase();
    if (!t) continue; if (!byTitle.has(t)) byTitle.set(t, new Set());
    byTitle.get(t)!.add(d.payload?._fingerprint ?? d.id);
  }
  const versionedTitles = [...byTitle.entries()].filter(([, fps]) => fps.size > 1);
  const versionedCount = versionedTitles.reduce((s, [, fps]) => s + fps.size, 0);

  // write results back to staging (+ fingerprint) and append audit entries
  for (let i = 0; i < exercises.length; i++) {
    const r = reports[i]; const d: any = (drafts ?? [])[i];
    const fp = fingerprintExercise(exercises[i]);
    const flags = [
      ...(d.flags ?? []).filter((f: string) => !f.startsWith("VALID:") && f !== "NEEDS_REPROCESS"),
      ...r.issues.map((s) => `VALID:${s}`),
      ...(r.needsReprocess ? ["NEEDS_REPROCESS"] : []),
    ];
    const hasCross = r.checks.some((c) => c.name === "cross_ocr_agreement");
    await db.from("import_draft_exercises").update({
      flags,
      payload: {
        ...(d.payload ?? {}),
        _validation: { needsReprocess: r.needsReprocess, minConfidence: r.minConfidence, checks: r.checks },
        _fingerprint: fp,
        ...(hasCross ? { _crossocr_fp: fp } : {}),
      },
    }).eq("id", d.id);

    await db.from("import_audit_log").insert({
      batch_id: (batch as any).id, draft_id: d.id, draft_idx: d.idx,
      event: r.needsReprocess ? "flagged_reprocess" : "validated",
      reason: r.issues.join("; ") || "all checks passed",
      details: { minConfidence: r.minConfidence, fingerprint: fp, checks: r.checks },
    });
  }

  // ── Report ──
  const reprocess = reports.filter((r) => r.needsReprocess);
  const totalQ = exercises.reduce((s, e) => s + e.questions.length, 0);
  const distinctPages = new Set(exercises.flatMap((e) => e.pages)).size;

  console.log(`\n══════════ VALIDATION REPORT — ${sourcePdf} ══════════`);
  console.log(`Page count (distinct, in drafts) : ${distinctPages}${(batch as any).total_pages ? " / " + (batch as any).total_pages + " in PDF" : ""}`);
  console.log(`Article (exercise) count         : ${exercises.length}`);
  console.log(`Question count                   : ${totalQ}`);
  console.log(`\nBatch page checks:`);
  for (const c of [pageReport.ordering, pageReport.overlap, pageReport.missing]) console.log(`  ${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  console.log(`\nContent-based duplicates (article+questions+key identical): ${dups.length}`);
  for (const g of dups) console.log(`  ⚠ idx ${g.idxs.join(" & ")} "${g.title}" — ${g.reason}`);
  console.log(`\nPer-exercise:`);
  for (const r of reports) {
    const tag = r.needsReprocess ? "REPROCESS" : "OK";
    console.log(`  [${r.idx}] ${tag} conf=${r.minConfidence.toFixed(2)} "${r.title}" ${r.issues.length ? "— " + r.issues.join("; ") : ""}`);
  }
  const status = reprocess.length === 0 && pageReport.ordering.ok && pageReport.overlap.ok ? "READY" : "NEEDS_REPROCESS";
  const avgConf = reports.length ? reports.reduce((s, r) => s + r.minConfidence, 0) / reports.length : 0;
  const autoFixes = (drafts ?? []).reduce((s: number, d: any) => s + (d.payload?._article_corrections ?? 0), 0);
  console.log(`\n── RESULT ──`);
  console.log(`  Passed         : ${exercises.length - reprocess.length}/${exercises.length}`);
  console.log(`  Needs reprocess: ${reprocess.length} (idx ${reprocess.map((r) => r.idx).join(",") || "—"})`);
  console.log(`  Automatic fixes (OCR corrections applied): ${autoFixes}`);
  console.log(`  Confidence score (avg min-confidence): ${avgConf.toFixed(2)}`);
  console.log(`  Final status   : ${status}`);
  console.log(`  Audit entries written: ${exercises.length}. Fingerprints stored per draft.`);

  // ── Batch summary ──
  const remainingManual = reports.filter((r) => r.needsReprocess && !removeIdx.has(r.idx)).length;
  console.log(`\n────────── BATCH SUMMARY ──────────`);
  console.log(`  Total exercises processed : ${exercises.length}`);
  console.log(`  Passed                    : ${exercises.length - reprocess.length - removeIdx.size}`);
  console.log(`  Reprocessed (flagged)     : ${reprocess.length}`);
  console.log(`  Duplicates removed        : ${removeIdx.size}${removeIdx.size ? " (idx " + [...removeIdx].join(",") + ")" : ""}`);
  console.log(`  Versioned duplicates      : ${versionedCount} across ${versionedTitles.length} title group(s)`);
  console.log(`  Remaining manual review   : ${remainingManual}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

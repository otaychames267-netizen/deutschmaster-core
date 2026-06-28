/**
 * run-validation.ts — reusable batch validation (used by the CLI and the
 * orchestrator). Deterministic multi-check pass over a batch's drafts; optional
 * deep cross-OCR only for low-confidence drafts. Writes results + fingerprints +
 * audit back to staging, soft-removes identical-content duplicates, and returns
 * a structured summary.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateExercise, validateBatchPages, resolveDuplicates, fingerprintExercise, type ExerciseLike, type Check } from "./validate";
import { ocrArticleTextWith } from "./ocr-extract";
import { mapConcurrent, destroyPool } from "./ocr-pool";

const pageNum = (p: string) => { const m = p.match(/page-(\d+)\.png$/); return m ? parseInt(m[1]) : 0; };
function sim(a: string, b: string): number {
  const ws = (s: string) => new Set((s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-zäöüß ]/g, " ").split(/\s+/).filter((w) => w.length >= 5));
  const A = ws(a), B = ws(b); if (!A.size || !B.size) return 0;
  let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i);
}

export interface BatchValidationSummary {
  sourcePdf: string; total: number; passed: number; reprocess: number;
  duplicatesRemoved: number; versionedDuplicates: number; versionReview: number; remainingManual: number;
  pageChecks: { ordering: boolean; overlap: boolean; missing: boolean };
  confidence: number; status: "READY" | "NEEDS_REPROCESS";
  reprocessIdx: number[];
}

export async function validateBatch(
  db: SupabaseClient,
  sourcePdf: string,
  opts: { crossPdfPath?: string; deepThreshold?: number } = {},
): Promise<BatchValidationSummary> {
  const { data: batch } = await db.from("import_batches").select("*").eq("source_pdf", sourcePdf).maybeSingle();
  if (!batch) throw new Error(`no batch for ${sourcePdf}`);
  const batchId = (batch as any).id;
  const { data: drafts } = await db.from("import_draft_exercises").select("*").eq("batch_id", batchId).order("idx");
  const rows = drafts ?? [];

  const exercises: ExerciseLike[] = rows.map((d: any) => ({
    idx: d.idx, title: d.title, article: d.article,
    pages: (d.page_images ?? []).map(pageNum).filter(Boolean),
    questions: d.payload?.questions ?? [], answerKey: d.payload?.answer_key ?? [],
  }));

  // Tier 1: deterministic for all
  let reports = exercises.map((e) => validateExercise(e));

  // Tier 2: deep cross-OCR only for low-confidence/flagged (parallel + cached)
  const deep = opts.deepThreshold ?? 0.85;
  if (opts.crossPdfPath) {
    const deepIdx = reports.map((r, i) => ({ i, d: r.needsReprocess || r.minConfidence < deep })).filter((x) => x.d).map((x) => x.i);
    if (deepIdx.length) {
      const extra = new Map<number, Check>();
      await mapConcurrent(deepIdx, async (i, worker) => {
        const cached = rows[i]?.payload?._validation?.checks?.find?.((c: any) => c.name === "cross_ocr_agreement");
        if (cached && rows[i]?.payload?._crossocr_fp && rows[i].payload._crossocr_fp === rows[i].payload?._fingerprint) { extra.set(i, cached); return; }
        const pg = exercises[i].pages[0]; if (!pg) return;
        try { const r = await ocrArticleTextWith(opts.crossPdfPath!, pg, worker, 3); const s = sim(r.text, exercises[i].article ?? ""); extra.set(i, { name: "cross_ocr_agreement", ok: s >= 0.5, confidence: s, detail: `independent OCR sim ${s.toFixed(2)}` }); } catch { /* skip */ }
      });
      await destroyPool();
      reports = reports.map((r, i) => extra.has(i) ? validateExercise(exercises[i], [extra.get(i)!]) : r);
    }
  }

  // Stricter content-based duplicate removal: drops incomplete phantoms + exact
  // duplicates, keeps genuinely distinct versions.
  const { drop } = resolveDuplicates(exercises);
  const idxToDraft = new Map(rows.map((d: any) => [d.idx, d]));
  const removeIdx = new Set<number>(drop);

  // Version-review flagging: any title that still has >1 surviving exercise is
  // an UNCERTAIN multi-version case (could be real versions OR a page mis-grouping).
  // Per spec, flag for human re-validation instead of auto-accepting as versions.
  const baseTitle = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/\s+\d+$/, "");
  const survivorsByTitle = new Map<string, number[]>();
  for (const e of exercises) {
    if (removeIdx.has(e.idx) || !e.title) continue;
    const k = baseTitle(e.title); if (!survivorsByTitle.has(k)) survivorsByTitle.set(k, []);
    survivorsByTitle.get(k)!.push(e.idx);
  }
  const versionReview = new Set<number>();
  for (const [, idxs] of survivorsByTitle) if (idxs.length > 1) for (const i of idxs) versionReview.add(i);

  // Write back results + fingerprints + audit
  for (let i = 0; i < exercises.length; i++) {
    const r = reports[i]; const d: any = rows[i]; const fp = fingerprintExercise(exercises[i]);
    const flags = [
      ...(d.flags ?? []).filter((f: string) => !f.startsWith("VALID:") && f !== "NEEDS_REPROCESS" && f !== "DUPLICATE_REMOVED" && f !== "VERSION_REVIEW"),
      ...r.issues.map((s) => `VALID:${s}`),
      ...(removeIdx.has(d.idx) ? ["DUPLICATE_REMOVED"] : r.needsReprocess ? ["NEEDS_REPROCESS"] : []),
      ...(versionReview.has(d.idx) ? ["VERSION_REVIEW"] : []),
    ];
    const hasCross = r.checks.some((c) => c.name === "cross_ocr_agreement");
    await db.from("import_draft_exercises").update({
      flags,
      status: removeIdx.has(d.idx) ? "rejected" : d.status,
      payload: { ...(d.payload ?? {}), _validation: { needsReprocess: r.needsReprocess, minConfidence: r.minConfidence, checks: r.checks }, _fingerprint: fp, ...(hasCross ? { _crossocr_fp: fp } : {}) },
    }).eq("id", d.id);
    await db.from("import_audit_log").insert({
      batch_id: batchId, draft_id: d.id, draft_idx: d.idx,
      event: removeIdx.has(d.idx) ? "duplicate_removed" : r.needsReprocess ? "flagged_reprocess" : "validated",
      reason: removeIdx.has(d.idx) ? "identical content to a kept exercise" : (r.issues.join("; ") || "all checks passed"),
      details: { minConfidence: r.minConfidence, fingerprint: fp },
    });
  }

  const pageReport = validateBatchPages(exercises, (batch as any).total_pages ?? undefined);
  const reprocess = reports.filter((r, i) => r.needsReprocess && !removeIdx.has(exercises[i].idx));
  const byTitle = new Map<string, Set<string>>();
  for (const d of rows) { const t = (d.raw_title ?? d.title ?? "").trim().toLowerCase(); if (!t) continue; if (!byTitle.has(t)) byTitle.set(t, new Set()); byTitle.get(t)!.add(d.payload?._fingerprint ?? d.id); }
  const versioned = [...byTitle.values()].filter((s) => s.size > 1).reduce((a, s) => a + s.size, 0);
  const status: "READY" | "NEEDS_REPROCESS" = reprocess.length === 0 && pageReport.ordering.ok && pageReport.overlap.ok ? "READY" : "NEEDS_REPROCESS";

  // mark batch
  await db.from("import_batches").update({ status: status === "READY" ? "ready" : "extracting", total_exercises: exercises.length }).eq("id", batchId);

  return {
    sourcePdf, total: exercises.length, passed: exercises.length - reprocess.length - removeIdx.size,
    reprocess: reprocess.length, duplicatesRemoved: removeIdx.size, versionedDuplicates: versioned,
    versionReview: versionReview.size,
    remainingManual: reprocess.length,
    pageChecks: { ordering: pageReport.ordering.ok, overlap: pageReport.overlap.ok, missing: pageReport.missing.ok },
    confidence: reports.length ? reports.reduce((s, r) => s + r.minConfidence, 0) / reports.length : 0,
    status, reprocessIdx: reprocess.map((r) => r.idx),
  };
}

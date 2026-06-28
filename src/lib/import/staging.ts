/**
 * staging.ts — write extraction drafts into the staging layer (Milestone 1 tables)
 * and upload their page images (Milestone 2 storage). NEVER touches live tables.
 *
 * Idempotent & resumable: batches are keyed by (source_pdf, section, teil) and
 * drafts by (batch_id, idx), so re-running upserts without creating duplicates.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadPageImage } from "./storage";
import { extractPageImagePng } from "./gemini-vision";

export interface DraftExercise {
  idx: number;                       // 1-based order within the PDF (preserved exactly)
  title: string | null;
  rawTitle: string | null;
  article: string | null;           // literal body text — never reworded
  payload: unknown;                 // section-specific structured content
  flags: string[];
  coherence: number | null;
  structureOk: boolean;
  articleSource?: string;
  pages: number[];                  // source page numbers (for image upload)
}

export interface BatchRef { id: string; existingIdx: Set<number>; status: string; }

/** Create or fetch the batch row for this (pdf, section, teil). */
export async function ensureBatch(
  db: SupabaseClient,
  args: { sourcePdf: string; section: string; teil: number | null; totalPages?: number },
): Promise<BatchRef> {
  const { data: existing } = await db.from("import_batches").select("id, status")
    .eq("source_pdf", args.sourcePdf).eq("section", args.section)
    .filter("teil", args.teil == null ? "is" : "eq", args.teil == null ? null : args.teil)
    .maybeSingle();

  let id: string; let status: string;
  if (existing) {
    id = (existing as any).id; status = (existing as any).status;
    if (args.totalPages != null) await db.from("import_batches").update({ total_pages: args.totalPages }).eq("id", id);
  } else {
    const { data, error } = await db.from("import_batches")
      .insert({ source_pdf: args.sourcePdf, section: args.section, teil: args.teil, status: "extracting", total_pages: args.totalPages })
      .select("id, status").single();
    if (error || !data) throw new Error(`ensureBatch: ${error?.message}`);
    id = (data as any).id; status = (data as any).status;
  }

  const { data: drafts } = await db.from("import_draft_exercises").select("idx").eq("batch_id", id);
  return { id, status, existingIdx: new Set((drafts ?? []).map((d: any) => d.idx)) };
}

/** Upload all page images for a draft and return their storage paths. */
async function uploadDraftPages(
  db: SupabaseClient, pdfPath: string, pdfName: string, section: string, teil: number | null, pages: number[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const p of pages) {
    const png = await extractPageImagePng(pdfPath, p);
    paths.push(await uploadPageImage(db, section, teil, pdfName, p, png));
  }
  return paths;
}

/**
 * Write one draft: upload its page images, then upsert the staging row.
 * Returns "written" | "skipped". `force` re-writes even if it already exists.
 */
export async function writeDraft(
  db: SupabaseClient,
  batch: BatchRef,
  draft: DraftExercise,
  ctx: { pdfPath: string; pdfName: string; section: string; teil: number | null },
  force = false,
): Promise<"written" | "skipped"> {
  if (batch.existingIdx.has(draft.idx) && !force) return "skipped";

  const pageImages = await uploadDraftPages(db, ctx.pdfPath, ctx.pdfName, ctx.section, ctx.teil, draft.pages);

  const row = {
    batch_id: batch.id,
    idx: draft.idx,
    section: ctx.section,
    teil: ctx.teil,
    title: draft.title,
    raw_title: draft.rawTitle,
    article: draft.article,
    payload: draft.payload as any,
    flags: draft.flags as any,
    coherence: draft.coherence,
    structure_ok: draft.structureOk,
    article_source: draft.articleSource ?? null,
    page_images: pageImages as any,
    status: "pending",
  };

  // Upsert on (batch_id, idx) — safe retry, no duplicates.
  const { error } = await db.from("import_draft_exercises").upsert(row, { onConflict: "batch_id,idx" });
  if (error) throw new Error(`writeDraft idx ${draft.idx}: ${error.message}`);
  batch.existingIdx.add(draft.idx);
  return "written";
}

export async function setBatchStatus(db: SupabaseClient, id: string, status: string, totalExercises?: number) {
  const patch: any = { status };
  if (totalExercises != null) patch.total_exercises = totalExercises;
  await db.from("import_batches").update(patch).eq("id", id);
}

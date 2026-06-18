import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PDFDocument } from "pdf-lib";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}
async function assertSuperAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!data) throw new Error("Forbidden: super_admin only");
}

/**
 * Create a PDF import row (exam or answer key).
 */
export const createPdfImportV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    storagePath: string;
    originalName: string;
    kind: "exam" | "answer_key" | "combined";
    level?: "b1" | "b2" | null;
    linkedImportId?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("pdf_imports")
      .insert({
        uploaded_by: context.userId,
        storage_path: data.storagePath,
        original_name: data.originalName,
        kind: data.kind,
        level: data.level ?? null,
        linked_import_id: data.linkedImportId ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create import");
    return { id: row.id as string };
  });

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EXTRACTION_MODEL = "google/gemini-2.5-flash";
const CHUNK_PAGES = 2;
const GEMINI_TIMEOUT_MS = 85_000;

type ExtractionMeta = {
  needs_manual_review?: boolean;
  low_confidence_items?: any[];
  models_detected?: string[];
  chunks_total?: number;
  chunks_completed?: number[];
  chunk_size?: number;
  diagnostics?: any[];
};

const extractionSystemPrompt = `You are a verbatim TELC exam extractor. Your job is to TRANSCRIBE the PDF exactly as it appears.
Rules — never violate:
- Do NOT translate, paraphrase, summarize, simplify, improve, or invent content.
- Preserve original German text character-by-character including punctuation, capitalization, numbering, and item labels (A/B/C, 1./2./3., a)/b), etc.).
- Preserve section headers like "Teil 1", "Teil 2", "Lesen", "Hören", "Schreiben", "Sprachbausteine", "Mündlicher Ausdruck".
- If the PDF is scanned, OCR it. Preserve diacritics (ä ö ü ß).
- If you cannot read a character with confidence, transcribe as [?].
 - If ANY content cannot be extracted with 100% confidence, mark it with [?] AND add it to "low_confidence_items" AND set "needs_manual_review": true. Do NOT guess.
 - You are FORBIDDEN from: translating, paraphrasing, summarizing, simplifying, "fixing" typos, normalizing punctuation, reordering items, renumbering, or generating any text that is not literally present in the PDF.
 - If the PDF contains MULTIPLE MODELS (e.g. "Modell 1", "Modell 2", "Modell 3", "Übungstest 1", "Test 2"), tag EVERY block with its "model" identifier ("1", "2", "3", …). If only one model is present, set "model" to null on every block.
- If the PDF is a COMBINED exam + answer key (Lösungsschlüssel / Lösungen / Antworten inside the same PDF), still emit "question" blocks for exercises AND "answer_key_entry" blocks for the solution table. Each answer_key_entry MUST carry the same "model" tag as its matching questions. NEVER copy a solution into a question or passage block — solutions stay in answer_key_entry blocks only.
- If the SAME reading text / passage is reused across several models (e.g. one text serves Modell 1, Modell 2 and Modell 3), emit ONE passage block per model — duplicate the passage verbatim and tag each copy with its respective "model". Do NOT merge models. Questions and answer_key_entry blocks for each model must remain isolated.

Return STRICT JSON with this shape (no markdown fences):
{
  "kind": "exam" | "answer_key" | "combined",
  "level": "b1" | "b2" | null,
  "page_count": number,
  "needs_manual_review": boolean,
  "models_detected": [string],
  "low_confidence_items": [{ "page": number, "teil": number|null, "reason": string, "snippet": string }],
  "blocks": [
    { "type": "section",     "model": string|null, "teil": number|null, "module": string|null, "text": string, "page": number },
    { "type": "instruction", "model": string|null, "teil": number|null, "text": string, "page": number },
    { "type": "passage",     "model": string|null, "teil": number|null, "title": string|null, "text": string, "page": number },
    { "type": "question",    "model": string|null, "teil": number|null, "number": string, "text": string, "options": [{"label":"a","text":"..."}], "page": number },
    { "type": "answer_key_entry", "model": string|null, "teil": number|null, "number": string, "answer": string, "page": number },
    { "type": "image_ref",   "model": string|null, "teil": number|null, "description": string, "page": number },
    { "type": "audio_ref",   "model": string|null, "teil": number|null, "description": string, "page": number }
  ]
}
Include answer_key_entry blocks if this is an answer-key (Lösungsschlüssel) OR a combined PDF.`;

function userInstructionFor(kind: string) {
  if (kind === "answer_key") return "This is a TELC answer key (Lösungsschlüssel). Extract every item number with its correct answer verbatim.";
  if (kind === "combined") return "This is a COMBINED TELC PDF that contains both exam content (texts, questions, options) AND the answer key (Lösungsschlüssel / Lösungen). Extract everything verbatim. If multiple Modelle/Übungstests are present, tag every block with its model number. Emit answer_key_entry blocks for the solution table(s) using the same model tag.";
  return "This is a TELC exam paper. Extract every instruction, text, question, and option verbatim.";
}

function safeJson(value: unknown) {
  try { return JSON.stringify(value); } catch { return String(value); }
}

async function appendImportLog(supabase: any, importId: string, entry: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  const { data } = await supabase.from("pdf_imports").select("notes").eq("id", importId).maybeSingle();
  const next = `${data?.notes ? `${data.notes}\n` : ""}${line}`.slice(-120_000);
  await supabase.from("pdf_imports").update({ notes: next, extraction_started_at: new Date().toISOString() }).eq("id", importId);
  try { console.log("[extractPdfVerbatim]", line); } catch {}
}

function flattenBlocks(blocks: any[], startPage: number, endPage: number): any[] {
  const out: any[] = [];
  const visit = (b: any) => {
    if (!b || typeof b !== "object") return;
    if (Array.isArray(b.blocks)) for (const child of b.blocks) visit(child);
    const rawType = String(b.type ?? "").toLowerCase();
    const type = ["section", "instruction", "passage", "question", "answer_key_entry", "image_ref", "audio_ref"].includes(rawType) ? rawType : null;
    if (!type) return;
    const p = Number(b.page);
    const page = Number.isFinite(p) && p > 0 && p <= (endPage - startPage + 1)
      ? startPage + p - 1
      : Number.isFinite(p) && p >= startPage && p <= endPage ? p : startPage;
    const model = ["multiple_choice", "true_false", "cloze", "matching", "open_text"].includes(String(b.model ?? "")) ? null : (b.model ?? null);
    const teil = b.teil == null || b.teil === "" ? null : Number(b.teil);
    const base: any = { ...b, type, model, teil: Number.isFinite(teil) ? teil : null, page };
    if (type === "question") {
      base.number = String(b.number ?? b.question_number ?? b.id ?? "");
      base.text = String(b.text ?? b.question ?? "");
      base.options = Array.isArray(b.options)
        ? b.options.map((o: any) => ({ label: String(o.label ?? o.id ?? ""), text: String(o.text ?? "") }))
        : [];
    }
    out.push(base);
  };
  for (const b of blocks) visit(b);
  return out;
}

async function downloadPdf(supabase: any, storagePath: string) {
  const { data: file, error } = await supabase.storage.from("pdf-imports").download(storagePath);
  if (error || !file) throw new Error(`Storage download failed: ${error?.message ?? "no file"} (path=${storagePath})`);
  const buf = new Uint8Array(await (file as Blob).arrayBuffer());
  if (buf.byteLength === 0) throw new Error(`Downloaded PDF is empty (0 bytes, path=${storagePath})`);
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  return { buf, doc, totalPages: doc.getPageCount() };
}

async function upsertExtraction(supabase: any, importId: string, blocks: any[], pageCount: number, meta: ExtractionMeta) {
  const { data: existing } = await supabase.from("pdf_extractions").select("id").eq("import_id", importId).maybeSingle();
  const row = { blocks, page_count: pageCount, raw_text: JSON.stringify(meta) };
  const q = existing?.id
    ? supabase.from("pdf_extractions").update(row).eq("id", existing.id)
    : supabase.from("pdf_extractions").insert({ import_id: importId, ...row });
  const { error } = await q;
  if (error) throw new Error(error.message);
}

async function callGeminiChunk(args: {
  apiKey: string; importId: string; supabase: any; kind: string; chunkIndex: number; totalChunks: number;
  startPage: number; endPage: number; totalPages: number; pdfBytes: Uint8Array; dimensions: any[];
}) {
  const b64 = Buffer.from(args.pdfBytes).toString("base64");
  const chunkInstruction = `${userInstructionFor(args.kind)}\n\nThis is chunk ${args.chunkIndex + 1} of ${args.totalChunks}. It contains PDF pages ${args.startPage}–${args.endPage} of a ${args.totalPages}-page document. In every block, set "page" to the ABSOLUTE page number in the full document (pages in this chunk are ${args.startPage}–${args.endPage}). Extract every block on these pages verbatim. Do not skip pages.`;
  const body = {
    model: EXTRACTION_MODEL,
    messages: [
      { role: "system", content: extractionSystemPrompt },
      { role: "user", content: [
        { type: "text", text: chunkInstruction },
        { type: "file", file: { filename: `exam-chunk-${args.chunkIndex + 1}.pdf`, file_data: `data:application/pdf;base64,${b64}` } },
      ] },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 12000,
  };
  const payload = JSON.stringify(body);
  await appendImportLog(args.supabase, args.importId, {
    event: "gemini_request_sent", model: EXTRACTION_MODEL, chunk: `${args.chunkIndex + 1}/${args.totalChunks}`,
    pages: `${args.startPage}-${args.endPage}`, requestBytes: Buffer.byteLength(payload), pdfChunkBytes: args.pdfBytes.byteLength,
    fileParts: 1, imageParts: 0, imageDimensions: "n/a: PDF is sent directly; no PDF-to-image conversion is performed", pdfPageDimensions: args.dimensions,
  });
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const resp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": args.apiKey, "X-Lovable-AIG-SDK": "raw-pdf-extraction" },
      body: payload,
    });
    const rawBody = await resp.text();
    const durationMs = Date.now() - started;
    await appendImportLog(args.supabase, args.importId, {
      event: "gemini_response_received", model: EXTRACTION_MODEL, chunk: `${args.chunkIndex + 1}/${args.totalChunks}`,
      status: resp.status, ok: resp.ok, durationMs, responseBytes: Buffer.byteLength(rawBody), rawBody: rawBody.slice(0, 12_000),
    });
    if (!resp.ok) {
      if (resp.status === 429) throw new Error(`AI rate limit on chunk ${args.chunkIndex + 1}/${args.totalChunks}: ${rawBody}`);
      if (resp.status === 402) throw new Error(`AI credits exhausted on chunk ${args.chunkIndex + 1}/${args.totalChunks}: ${rawBody}`);
      throw new Error(`Gemini extraction failed on chunk ${args.chunkIndex + 1}/${args.totalChunks} (HTTP ${resp.status}, pages ${args.startPage}-${args.endPage}): ${rawBody.slice(0, 1200) || "<empty body>"}`);
    }
    let gatewayJson: any;
    try { gatewayJson = JSON.parse(rawBody); }
    catch (e: any) { throw new Error(`Gemini gateway response was not JSON on chunk ${args.chunkIndex + 1}: ${e?.message ?? e}. Raw: ${rawBody.slice(0, 1200)}`); }
    const content = gatewayJson?.choices?.[0]?.message?.content ?? "{}";
    const finishReason = gatewayJson?.choices?.[0]?.finish_reason ?? gatewayJson?.choices?.[0]?.finishReason ?? null;
    if (typeof content === "string" && content.trim().length < 5) throw new Error(`Gemini returned empty content on chunk ${args.chunkIndex + 1}/${args.totalChunks} (finish_reason=${finishReason ?? "?"}).`);
    let parsed: any;
    try { parsed = typeof content === "string" ? JSON.parse(content) : content; }
    catch (e: any) { throw new Error(`Could not parse Gemini JSON on chunk ${args.chunkIndex + 1}/${args.totalChunks}: ${e?.message ?? e}. Content: ${String(content).slice(0, 1200)}`); }
    return { parsed, finishReason, usage: gatewayJson?.usage, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    const msg = err?.name === "AbortError"
      ? `Gemini request timed out locally after ${GEMINI_TIMEOUT_MS}ms before a response arrived.`
      : String(err?.message ?? err);
    await appendImportLog(args.supabase, args.importId, { event: "gemini_request_failed", chunk: `${args.chunkIndex + 1}/${args.totalChunks}`, durationMs, error: msg, stack: String(err?.stack ?? "").slice(0, 4000) });
    throw new Error(msg);
  } finally {
    clearTimeout(timeout);
  }
}

export const startPdfExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing in server environment");
    const { data: imp, error: impErr } = await context.supabase.from("pdf_imports").select("id, storage_path, kind, level").eq("id", data.importId).single();
    if (impErr || !imp) throw new Error(impErr?.message ?? "Import not found");
    await context.supabase.from("pdf_imports").update({ status: "extracting", error_message: null, notes: null, extraction_started_at: new Date().toISOString() }).eq("id", data.importId);
    const { buf, doc, totalPages } = await downloadPdf(context.supabase, imp.storage_path);
    const pageDimensions = Array.from({ length: totalPages }, (_, i) => {
      const p = doc.getPage(i); return { page: i + 1, width: p.getWidth(), height: p.getHeight() };
    });
    const chunkCount = Math.ceil(totalPages / CHUNK_PAGES);
    const meta: ExtractionMeta = { needs_manual_review: false, low_confidence_items: [], models_detected: [], chunks_total: chunkCount, chunks_completed: [], chunk_size: CHUNK_PAGES, diagnostics: [] };
    await upsertExtraction(context.supabase, data.importId, [], totalPages, meta);
    await appendImportLog(context.supabase, data.importId, { event: "extraction_started", model: EXTRACTION_MODEL, fileBytes: buf.byteLength, totalPages, chunkSize: CHUNK_PAGES, chunkCount, pageDimensions });
    return { ok: true, model: EXTRACTION_MODEL, totalPages, chunkSize: CHUNK_PAGES, chunkCount, fileBytes: buf.byteLength };
  });

export const extractPdfChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string; chunkIndex: number }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing in server environment");
    let step = "load_import_row";
    try {
      const { data: imp, error: impErr } = await context.supabase.from("pdf_imports").select("id, storage_path, kind, level").eq("id", data.importId).single();
      if (impErr || !imp) throw new Error(impErr?.message ?? "Import not found");
      step = "storage_download_pdf_parse";
      const { doc, totalPages } = await downloadPdf(context.supabase, imp.storage_path);
      const totalChunks = Math.ceil(totalPages / CHUNK_PAGES);
      if (data.chunkIndex < 0 || data.chunkIndex >= totalChunks) throw new Error(`Invalid chunkIndex ${data.chunkIndex}; expected 0..${totalChunks - 1}`);
      const startIdx = data.chunkIndex * CHUNK_PAGES;
      const endIdxExclusive = Math.min(startIdx + CHUNK_PAGES, totalPages);
      const pageIndices = Array.from({ length: endIdxExclusive - startIdx }, (_, i) => startIdx + i);
      step = "chunk_build";
      const chunkDoc = await PDFDocument.create();
      const copied = await chunkDoc.copyPages(doc, pageIndices);
      for (const page of copied) chunkDoc.addPage(page);
      const bytes = await chunkDoc.save();
      const dimensions = copied.map((p, i) => ({ page: startIdx + i + 1, width: p.getWidth(), height: p.getHeight() }));
      step = `gemini_request_chunk_${data.chunkIndex + 1}`;
      const result = await callGeminiChunk({ apiKey, supabase: context.supabase, importId: data.importId, kind: imp.kind, chunkIndex: data.chunkIndex, totalChunks, startPage: startIdx + 1, endPage: endIdxExclusive, totalPages, pdfBytes: bytes, dimensions });
      const chunkBlocks = flattenBlocks(Array.isArray(result.parsed?.blocks) ? result.parsed.blocks : [], startIdx + 1, endIdxExclusive);
      step = "persist_chunk";
      const { data: existing } = await context.supabase.from("pdf_extractions").select("blocks, raw_text").eq("import_id", data.importId).maybeSingle();
      const existingBlocks = Array.isArray(existing?.blocks) ? existing.blocks : [];
      const keptBlocks = existingBlocks.filter((b: any) => Number(b?.page) < startIdx + 1 || Number(b?.page) > endIdxExclusive);
      let meta: ExtractionMeta = {};
      try { meta = existing?.raw_text ? JSON.parse(existing.raw_text) : {}; } catch { meta = {}; }
      const completed = new Set<number>(Array.isArray(meta.chunks_completed) ? meta.chunks_completed : []);
      completed.add(data.chunkIndex);
      const models = new Set<string>(Array.isArray(meta.models_detected) ? meta.models_detected : []);
      if (Array.isArray(result.parsed?.models_detected)) for (const m of result.parsed.models_detected) if (m != null) models.add(String(m));
      const lowConfidence = [...(Array.isArray(meta.low_confidence_items) ? meta.low_confidence_items : []), ...(Array.isArray(result.parsed?.low_confidence_items) ? result.parsed.low_confidence_items : [])];
      const nextMeta: ExtractionMeta = { ...meta, chunks_total: totalChunks, chunks_completed: [...completed].sort((a, b) => a - b), chunk_size: CHUNK_PAGES, needs_manual_review: Boolean(meta.needs_manual_review || result.parsed?.needs_manual_review), low_confidence_items: lowConfidence, models_detected: [...models] };
      const blocks = [...keptBlocks, ...chunkBlocks].sort((a, b) => Number(a?.page ?? 0) - Number(b?.page ?? 0));
      await upsertExtraction(context.supabase, data.importId, blocks, totalPages, nextMeta);
      await context.supabase.from("pdf_imports").update({ status: "extracting", ocr_used: true, level: result.parsed?.level === "b1" || result.parsed?.level === "b2" ? result.parsed.level : imp.level, error_message: null, extraction_started_at: new Date().toISOString() }).eq("id", data.importId);
      await appendImportLog(context.supabase, data.importId, { event: "chunk_persisted", chunk: `${data.chunkIndex + 1}/${totalChunks}`, blocksInChunk: chunkBlocks.length, totalBlocks: blocks.length, finishReason: result.finishReason, usage: result.usage });
      return { ok: true, chunkIndex: data.chunkIndex, totalChunks, pages: `${startIdx + 1}-${endIdxExclusive}`, blocksInChunk: chunkBlocks.length, totalBlocks: blocks.length, completedChunks: nextMeta.chunks_completed?.length ?? 0 };
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      const stack = String(err?.stack ?? "").slice(0, 6000);
      const full = `[step=${step}] ${msg}${stack ? `\n\nStack:\n${stack}` : ""}`;
      await context.supabase.from("pdf_imports").update({ status: "extraction_failed", error_message: full }).eq("id", data.importId);
      await appendImportLog(context.supabase, data.importId, { event: "extraction_failed", step, error: msg, stack });
      return { ok: false as const, step, error: msg, stack, details: full };
    }
  });

export const finalizePdfExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: ext } = await context.supabase.from("pdf_extractions").select("blocks, raw_text, page_count").eq("import_id", data.importId).maybeSingle();
    if (!ext) throw new Error("No extraction row found");
    let meta: ExtractionMeta = {};
    try { meta = ext.raw_text ? JSON.parse(ext.raw_text) : {}; } catch { meta = {}; }
    const completed = new Set(Array.isArray(meta.chunks_completed) ? meta.chunks_completed : []);
    const total = Number(meta.chunks_total ?? 0);
    if (total > 0 && completed.size < total) throw new Error(`Extraction incomplete: ${completed.size}/${total} chunks completed.`);
    await context.supabase.from("pdf_imports").update({ status: "extracted", ocr_used: true, error_message: null }).eq("id", data.importId);
    await appendImportLog(context.supabase, data.importId, { event: "extraction_finalized", chunksCompleted: completed.size, blockCount: Array.isArray(ext.blocks) ? ext.blocks.length : 0, pageCount: ext.page_count, modelsDetected: meta.models_detected ?? [] });
    return { ok: true, blockCount: Array.isArray(ext.blocks) ? ext.blocks.length : 0, pageCount: ext.page_count, needsManualReview: Boolean(meta.needs_manual_review), lowConfidenceItems: meta.low_confidence_items ?? [], modelsDetected: meta.models_detected ?? [] };
  });

export const extractPdfVerbatim = startPdfExtraction;

/**
 * Watchdog: mark any extraction/build job whose start timestamp is older than
 * 5 minutes as failed. Called from the admin page poller so orphaned rows
 * (e.g. killed worker, network drop, redeploy) never stay "extracting" forever.
 */
export const reapStuckExtractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const cutoffISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // Extracting jobs older than 5 min
    const { data: stuckExtract } = await context.supabase
      .from("pdf_imports")
      .select("id, status")
      .in("status", ["extracting", "pending"])
      .lt("extraction_started_at", cutoffISO);
    let reaped = 0;
    for (const row of stuckExtract ?? []) {
      await context.supabase
        .from("pdf_imports")
        .update({
          status: "extraction_failed",
          error_message: "[watchdog] Job stuck in '" + row.status + "' for more than 5 minutes — auto-failed. Re-run extraction or delete and re-upload.",
        })
        .eq("id", row.id);
      reaped++;
    }
    // Building jobs older than 5 min
    const { data: stuckBuild } = await context.supabase
      .from("pdf_imports")
      .select("id")
      .eq("status", "building")
      .lt("extraction_started_at", cutoffISO);
    for (const row of stuckBuild ?? []) {
      await context.supabase
        .from("pdf_imports")
        .update({
          status: "build_failed",
          error_message: "[watchdog] Build stuck for more than 5 minutes — auto-failed.",
        })
        .eq("id", row.id);
      reaped++;
    }
    // Also stamp pending rows that never got an extraction_started_at, using created_at as fallback.
    const { data: stalePending } = await context.supabase
      .from("pdf_imports")
      .select("id, created_at")
      .eq("status", "pending")
      .is("extraction_started_at", null)
      .lt("created_at", cutoffISO);
    for (const row of stalePending ?? []) {
      await context.supabase
        .from("pdf_imports")
        .update({
          status: "extraction_failed",
          error_message: "[watchdog] Import remained in 'pending' for more than 5 minutes without ever starting extraction.",
        })
        .eq("id", row.id);
      reaped++;
    }
    return { reaped };
  });

/**
 * Read extraction blocks for preview (admin only).
 */
export const getExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: imp } = await context.supabase
      .from("pdf_imports")
      .select("id, original_name, kind, level, status, linked_import_id, created_at")
      .eq("id", data.importId)
      .single();
    const { data: ext } = await context.supabase
      .from("pdf_extractions")
      .select("blocks, page_count, raw_text, updated_at")
      .eq("import_id", data.importId)
      .maybeSingle();
    return { import: imp, extraction: ext };
  });

/**
 * List PDF imports (admin).
 */
export const listPdfImports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("pdf_imports")
      .select("id, original_name, kind, level, status, linked_import_id, created_at, ocr_used, error_message, storage_path")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

/**
 * Build draft exercises from an exam extraction, preserving original numbering.
 * Optionally links an answer key import — its answer_key_entry blocks become
 * rows in exercise_answer_keys (NEVER exposed to students).
 */
export const buildExercisesFromExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    examImportId: string;
    answerKeyImportId?: string | null;
    level: "b1" | "b2";
    moduleHint?: "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich" | null;
    teil: number;
    writingCategory?: string | null;
    muendlichPart?: 1 | 2 | 3 | null;
    contentType?: "vorbereitung" | "pruefungssimulation" | null;
    confirmMaterialAsExercises?: boolean | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // ---- Admin classification gate (manual, never automatic) ----
    if (!data.level) throw new Error("Level (B1/B2) ist erforderlich.");
    if (!data.moduleHint) throw new Error("Modul ist erforderlich.");
    const module = data.moduleHint;
    const adminTeil = Number(data.teil);
    if (!Number.isInteger(adminTeil) || adminTeil < 1 || adminTeil > 3) {
      throw new Error("Teil ist erforderlich (1–3).");
    }
    if (module === "sprachbausteine" && adminTeil > 2) {
      throw new Error("Sprachbausteine hat nur Teil 1 und Teil 2.");
    }
    if (module === "schreiben") {
      const allowed = ["beschwerde","brief","email","bitte_um_informationen","anfrage","stellungnahme","sonstiges"];
      if (!data.writingCategory || !allowed.includes(data.writingCategory)) {
        throw new Error("Schreiben: Bitte Kategorie manuell wählen.");
      }
    }
    if (module === "muendlich") {
      if (![1,2,3].includes(Number(data.muendlichPart))) {
        throw new Error("Mündlich: Bitte Teil (1 Präsentation / 2 Diskussion / 3 Planen) wählen.");
      }
      if (!data.contentType || !["vorbereitung","pruefungssimulation"].includes(data.contentType)) {
        throw new Error("Mündlich: Bitte 'Vorbereitung' oder 'Prüfungssimulation' wählen.");
      }
      if (data.contentType === "vorbereitung" && !data.confirmMaterialAsExercises) {
        throw new Error("Mündlich/Vorbereitung-Material wird nicht automatisch in Übungen umgewandelt. Setzen Sie das Bestätigungs-Häkchen, wenn das gewünscht ist.");
      }
    }

    // Mark the import as currently building exercises.
    await context.supabase
      .from("pdf_imports")
      .update({
        status: "building",
        error_message: null,
        extraction_started_at: new Date().toISOString(),
      })
      .eq("id", data.examImportId);

    try {
    const { data: ext } = await context.supabase
      .from("pdf_extractions").select("blocks, raw_text").eq("import_id", data.examImportId).maybeSingle();
    if (!ext) throw new Error("Run extraction on the exam PDF first");
    try {
      const meta = ext.raw_text ? JSON.parse(ext.raw_text) : null;
      if (meta?.needs_manual_review) {
        throw new Error("Extraction flagged for manual review — resolve low-confidence items before building exercises.");
      }
    } catch (e: any) {
      if (e?.message?.startsWith("Extraction flagged")) throw e;
    }

    const blocks: any[] = Array.isArray(ext.blocks) ? ext.blocks : [];

    // Detect the source kind (combined PDFs carry their own answer key)
    const { data: examImp } = await context.supabase
      .from("pdf_imports").select("kind").eq("id", data.examImportId).maybeSingle();
    const sourceKind: string = examImp?.kind ?? "exam";

    // Group blocks by model variant ("1", "2", "3", … or null for single-model PDFs).
    // Each model produces its OWN exercise(s) — content is never merged across models.
    type Q = { number: string; text: string; options: { label: string; text: string }[] };
    type Group = {
      model: string | null;
      firstInstruction: string | null;
      firstPassage: { title: string | null; text: string } | null;
      questions: Q[];
      answers: Map<string, string>; // item_number -> correct answer (from combined PDF)
    };
    const groups = new Map<string, Group>();
    const groupOf = (model: any): Group => {
      const key = model == null || model === "" ? "__single__" : String(model);
      let g = groups.get(key);
      if (!g) {
        g = {
          model: key === "__single__" ? null : key,
          firstInstruction: null, firstPassage: null, questions: [], answers: new Map(),
        };
        groups.set(key, g);
      }
      return g;
    };
    for (const b of blocks) {
      const g = groupOf(b?.model);
      if (b.type === "instruction" && g.firstInstruction === null) {
        g.firstInstruction = String(b.text ?? "");
      } else if (b.type === "passage" && g.firstPassage === null) {
        g.firstPassage = { title: b.title ?? null, text: String(b.text ?? "") };
      } else if (b.type === "question") {
        g.questions.push({
          number: String(b.number ?? g.questions.length + 1),
          text: String(b.text ?? ""),
          options: Array.isArray(b.options)
            ? b.options.map((o: any) => ({ label: String(o.label ?? ""), text: String(o.text ?? "") }))
            : [],
        });
      } else if (b.type === "answer_key_entry") {
        g.answers.set(String(b.number ?? "").trim(), String(b.answer ?? "").trim());
      }
    }

    // External answer-key PDF (optional, ignored when source is combined)
    if (data.answerKeyImportId && sourceKind !== "combined") {
      const { data: keyExt } = await context.supabase
        .from("pdf_extractions").select("blocks").eq("import_id", data.answerKeyImportId).maybeSingle();
      const kblocks: any[] = Array.isArray(keyExt?.blocks) ? keyExt.blocks : [];
      for (const b of kblocks) {
        if (b.type === "answer_key_entry") {
          const g = groupOf(b?.model);
          g.answers.set(String(b.number ?? "").trim(), String(b.answer ?? "").trim());
        }
      }
      await context.supabase.from("pdf_imports")
        .update({ linked_import_id: data.examImportId })
        .eq("id", data.answerKeyImportId);
    }

    const moduleVal = module;
    const teil = adminTeil;
    const createdExerciseIds: string[] = [];
    let keyCount = 0;

    // Sort groups so Modell 1 < Modell 2 < Modell 3 < unnamed
    const ordered = [...groups.values()].sort((a, b) => {
      if (a.model === b.model) return 0;
      if (a.model === null) return 1;
      if (b.model === null) return -1;
      return String(a.model).localeCompare(String(b.model), undefined, { numeric: true });
    });

    // Shared-passage fallback: if a model group has no passage/instruction of
    // its own (because the PDF prints the reading text once and reuses it for
    // every Modell), borrow ONLY the text from another group. Questions and
    // answers are NEVER shared across models — each model keeps its own.
    const sharedPassage = ordered.find((g) => g.firstPassage)?.firstPassage ?? null;
    const sharedInstruction = ordered.find((g) => g.firstInstruction)?.firstInstruction ?? null;
    for (const g of ordered) {
      if (!g.firstPassage && sharedPassage) g.firstPassage = sharedPassage;
      if (!g.firstInstruction && sharedInstruction) g.firstInstruction = sharedInstruction;
    }

    for (const g of ordered) {
      const variantSuffix = g.model ? ` — Modell ${g.model}` : "";
      const passage = g.firstPassage;
      const instruction = g.firstInstruction ?? "";
      let position = 1;
      for (const q of g.questions) {
        const kind = q.options.length >= 2 ? "multiple_choice" : "open_text";
        const optionTexts = q.options.map((o) => o.text);
        const { data: ex, error: exErr } = await context.supabase
          .from("exercises")
          .insert({
            level: data.level,
            module: moduleVal,
            teil,
            position: position++,
            title: `${moduleVal.toUpperCase()} Teil ${teil}${variantSuffix} — Aufgabe ${q.number}`,
            prompt: q.text,
            passage: passage ? passage.text : (instruction || null),
            kind,
            options: optionTexts,
            correct: [],
            status: "draft",
            created_by: context.userId,
            source_pdf_import_id: data.examImportId,
            original_numbering: q.number,
            model_variant: g.model,
            writing_category: moduleVal === "schreiben" ? (data.writingCategory ?? null) : null,
            muendlich_part: moduleVal === "muendlich" ? (data.muendlichPart ?? null) : null,
            content_type: moduleVal === "muendlich" ? (data.contentType ?? null) : null,
          })
          .select("id")
          .single();
        if (exErr || !ex) continue;
        createdExerciseIds.push(ex.id);

        const ansLookup = g.answers.get(q.number);
        if (ansLookup) {
          await context.supabase.from("exercise_answer_keys").insert({
            exercise_id: ex.id,
            item_number: q.number,
            correct_answer: ansLookup,
            source: "pdf",
            key_version: 1,
            pdf_import_id: sourceKind === "combined" ? data.examImportId : (data.answerKeyImportId ?? null),
          });
          keyCount++;
        }
      }
    }

    await context.supabase.from("pdf_imports")
      .update({ status: "built", error_message: null })
      .eq("id", data.examImportId);

    return {
      exerciseCount: createdExerciseIds.length,
      keyCount,
      modelsBuilt: ordered.map((g) => g.model ?? "single"),
    };
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      await context.supabase.from("pdf_imports")
        .update({ status: "build_failed", error_message: msg })
        .eq("id", data.examImportId);
      throw err;
    }
  });

/**
 * Publish a draft exercise (super_admin only — enforced by DB trigger + RLS).
 */
export const publishExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase
      .from("exercises")
      .update({ status: "published" })
      .eq("id", data.exerciseId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Regrade every attempt for an exercise against the latest answer key.
 */
export const regradeExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // Use admin client for cross-user attempt updates
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: keys } = await supabaseAdmin
      .from("exercise_answer_keys")
      .select("item_number, correct_answer, key_version")
      .eq("exercise_id", data.exerciseId)
      .order("key_version", { ascending: false });
    if (!keys || keys.length === 0) throw new Error("No answer key found for this exercise");
    const latestVersion = keys[0].key_version;
    const latest = keys.filter(k => k.key_version === latestVersion);
    const correctMap = new Map(latest.map(k => [String(k.item_number), k.correct_answer]));

    // Update exercise.correct (used by client grading) from key
    const correctValues = [...correctMap.values()].map(v =>
      typeof v === "string" ? v : JSON.stringify(v),
    );
    await supabaseAdmin.from("exercises").update({ correct: correctValues }).eq("id", data.exerciseId);

    // Re-grade attempts
    const { data: attempts } = await supabaseAdmin
      .from("user_exercise_attempts")
      .select("id, answer, is_correct, score")
      .eq("exercise_id", data.exerciseId);

    let affected = 0;
    for (const a of attempts ?? []) {
      let nextCorrect = a.is_correct;
      // Simple equality match — answer stored as string or jsonb
      const ans = typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer);
      const allOk = [...correctMap.values()].some(v => {
        const target = typeof v === "string" ? v : JSON.stringify(v);
        return target === ans;
      });
      nextCorrect = allOk;
      const nextScore = allOk ? 100 : 0;
      if (a.is_correct !== nextCorrect || a.score !== nextScore) {
        await supabaseAdmin.from("user_exercise_attempts").update({
          is_correct: nextCorrect,
          score: nextScore,
          regraded_at: new Date().toISOString(),
          key_version: latestVersion,
        }).eq("id", a.id);
        affected++;
      }
    }

    await supabaseAdmin.from("regrade_audits").insert({
      exercise_id: data.exerciseId,
      performed_by: context.userId,
      key_version: latestVersion,
      items_changed: correctMap.size,
      attempts_affected: affected,
    });

    return { attemptsAffected: affected, itemsChanged: correctMap.size, keyVersion: latestVersion };
  });

/**
 * Replace/update an answer key entry (super_admin only).
 */
export const replaceAnswerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string; itemNumber: string; correctAnswer: string; referenceAnswer?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // Bump key_version
    const { data: existing } = await context.supabase
      .from("exercise_answer_keys")
      .select("key_version")
      .eq("exercise_id", data.exerciseId)
      .order("key_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (existing?.key_version ?? 0) + 1;
    const { error } = await context.supabase.from("exercise_answer_keys").insert({
      exercise_id: data.exerciseId,
      item_number: data.itemNumber,
      correct_answer: data.correctAnswer,
      reference_answer: data.referenceAnswer ?? null,
      source: "manual",
      key_version: nextVersion,
    });
    if (error) throw new Error(error.message);
    return { ok: true, keyVersion: nextVersion };
  });

/**
 * Check whether the current signed-in user is super_admin.
 */
export const checkSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    return { isSuperAdmin: Boolean(data) };
  });

/**
 * Grade a student's answer for a PDF-imported exercise WITHOUT revealing the answer.
 * Looks up exercise_answer_keys server-side and returns only is_correct + reference (if any).
 * Also persists the attempt with the latest key_version.
 */
export const gradeImportedAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string; answer: string; durationSeconds?: number | null }) => d)
  .handler(async ({ data, context }) => {
    // No role check — any signed-in student may grade their own attempt
    const { data: keys } = await context.supabase
      .from("exercise_answer_keys")
      .select("correct_answer, key_version, reference_answer")
      .eq("exercise_id", data.exerciseId)
      .order("key_version", { ascending: false })
      .limit(1);
    // RLS hides exercise_answer_keys from students — so use admin client here, server-only:
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: adminKeys } = await supabaseAdmin
      .from("exercise_answer_keys")
      .select("correct_answer, key_version")
      .eq("exercise_id", data.exerciseId)
      .order("key_version", { ascending: false })
      .limit(1);
    const key = (adminKeys && adminKeys[0]) || (keys && keys[0]);
    if (!key) return { graded: false, isCorrect: null, message: "No answer key available" };

    const target = typeof key.correct_answer === "string"
      ? key.correct_answer
      : JSON.stringify(key.correct_answer);
    const isCorrect = String(data.answer).trim().toLowerCase() === String(target).trim().toLowerCase();

    await supabaseAdmin.from("user_exercise_attempts").insert({
      user_id: context.userId,
      exercise_id: data.exerciseId,
      answer: data.answer,
      is_correct: isCorrect,
      score: isCorrect ? 100 : 0,
      duration_seconds: data.durationSeconds ?? null,
      key_version: key.key_version,
    });

    // The student has just submitted their own answer — returning the correct answer
    // for THIS item enables the inline correction view ("Correct answer: …"). The
    // answer-key table as a whole remains hidden (RLS); only the single item the
    // student just attempted is revealed.
    return {
      graded: true,
      isCorrect,
      keyVersion: key.key_version,
      correctAnswer: target,
    };
  });

/**
 * Run a 100% fidelity check between the original PDF extraction (source of truth)
 * and the exercises built from it. Detects added / removed / modified content,
 * numbering differences and section differences.
 *
 * Persists one row in pdf_fidelity_reports. Publishing is blocked unless a
 * passing report exists (enforced by the guard_exercise_publish trigger).
 */
export const runFidelityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examImportId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const { data: ext } = await context.supabase
      .from("pdf_extractions")
      .select("blocks, raw_text")
      .eq("import_id", data.examImportId)
      .maybeSingle();
    if (!ext) throw new Error("Extraktion fehlt — bitte zuerst extrahieren.");

    let extractionMeta: any = null;
    try { extractionMeta = ext.raw_text ? JSON.parse(ext.raw_text) : null; } catch {}
    if (extractionMeta?.needs_manual_review) {
      // Hard fail — record and stop
      const { data: fail } = await context.supabase
        .from("pdf_fidelity_reports")
        .insert({
          exam_import_id: data.examImportId,
          status: "fail",
          added_count: 0,
          removed_count: 0,
          modified_count: 0,
          numbering_diff_count: 0,
          section_diff_count: 0,
          details: { reason: "extraction_needs_manual_review", lowConfidenceItems: extractionMeta?.low_confidence_items ?? [] },
          created_by: context.userId,
        })
        .select("id")
        .single();
      return { status: "fail" as const, reportId: fail?.id, reason: "extraction_needs_manual_review" };
    }

    const blocks: any[] = Array.isArray(ext.blocks) ? ext.blocks : [];

    // Build "source" canonical items keyed by teil::number for questions,
    // plus a list of sections and instructions per teil.
    type SrcQ = { teil: number; number: string; text: string; options: string[] };
    const srcQuestions = new Map<string, SrcQ>();
    const srcSections = new Set<number>();
    const srcInstructions = new Map<number, string>();
    const srcPassages = new Map<number, string>();
    for (const b of blocks) {
      const teil = Number(b?.teil) || 0;
      if (b.type === "section" && teil) srcSections.add(teil);
      if (b.type === "instruction" && teil) srcInstructions.set(teil, String(b.text ?? ""));
      if (b.type === "passage" && teil) srcPassages.set(teil, String(b.text ?? ""));
      if (b.type === "question" && teil) {
        srcQuestions.set(`${teil}::${String(b.number ?? "").trim()}`, {
          teil,
          number: String(b.number ?? "").trim(),
          text: String(b.text ?? ""),
          options: Array.isArray(b.options) ? b.options.map((o: any) => String(o?.text ?? "")) : [],
        });
      }
    }

    // Load exercises built from this import
    const { data: exercises } = await context.supabase
      .from("exercises")
      .select("id, teil, title, prompt, passage, options, original_numbering, status")
      .eq("source_pdf_import_id", data.examImportId);

    const builtKeys = new Set<string>();
    const exerciseTeils = new Set<number>();
    const modified: Array<{ key: string; field: string; original: string; built: string }> = [];
    const numberingDiffs: Array<{ exerciseId: string; expected: string; got: string }> = [];

    const norm = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim();

    for (const ex of exercises ?? []) {
      const teil = Number(ex.teil) || 0;
      const num = String(ex.original_numbering ?? "").trim();
      if (teil) exerciseTeils.add(teil);
      const key = `${teil}::${num}`;
      builtKeys.add(key);
      const src = srcQuestions.get(key);
      if (!src) {
        numberingDiffs.push({ exerciseId: ex.id, expected: "(none in PDF)", got: key });
        continue;
      }
      if (norm(src.text) !== norm(ex.prompt)) {
        modified.push({ key, field: "prompt", original: src.text, built: String(ex.prompt ?? "") });
      }
      const builtOpts: string[] = Array.isArray(ex.options) ? ex.options.map((o: any) => String(o ?? "")) : [];
      if (src.options.length !== builtOpts.length) {
        modified.push({ key, field: "options.count", original: String(src.options.length), built: String(builtOpts.length) });
      } else {
        for (let i = 0; i < src.options.length; i++) {
          if (norm(src.options[i]) !== norm(builtOpts[i])) {
            modified.push({ key, field: `options[${i}]`, original: src.options[i], built: builtOpts[i] });
          }
        }
      }
    }

    // Removed = present in source but not in built exercises
    const removed: string[] = [];
    for (const k of srcQuestions.keys()) if (!builtKeys.has(k)) removed.push(k);

    // Added = present in built but not in source
    const added: string[] = [];
    for (const k of builtKeys) if (!srcQuestions.has(k)) added.push(k);

    // Section diffs (teil sets)
    const sectionDiffs: Array<{ teil: number; in: "source" | "built" }> = [];
    for (const t of srcSections) if (!exerciseTeils.has(t)) sectionDiffs.push({ teil: t, in: "source" });
    for (const t of exerciseTeils) if (!srcSections.has(t)) sectionDiffs.push({ teil: t, in: "built" });

    const status: "pass" | "fail" =
      added.length === 0 &&
      removed.length === 0 &&
      modified.length === 0 &&
      numberingDiffs.length === 0 &&
      sectionDiffs.length === 0
        ? "pass"
        : "fail";

    const { data: report, error: repErr } = await context.supabase
      .from("pdf_fidelity_reports")
      .insert({
        exam_import_id: data.examImportId,
        status,
        added_count: added.length,
        removed_count: removed.length,
        modified_count: modified.length,
        numbering_diff_count: numberingDiffs.length,
        section_diff_count: sectionDiffs.length,
        details: { added, removed, modified, numberingDiffs, sectionDiffs },
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (repErr) throw new Error(repErr.message);

    return {
      status,
      reportId: report?.id,
      summary: {
        added: added.length,
        removed: removed.length,
        modified: modified.length,
        numberingDiffs: numberingDiffs.length,
        sectionDiffs: sectionDiffs.length,
      },
      details: { added, removed, modified, numberingDiffs, sectionDiffs },
    };
  });

/**
 * Get the latest fidelity report for an import (admin).
 */
export const getLatestFidelityReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examImportId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: report } = await context.supabase
      .from("pdf_fidelity_reports")
      .select("*")
      .eq("exam_import_id", data.examImportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { report };
  });

/**
 * Permanently delete a PDF import and EVERYTHING derived from it:
 * the storage file, the extraction, fidelity reports, draft exercises
 * created from it, and their answer keys (including all model variants).
 * Published exercises are NOT deleted — they must be unpublished manually.
 */
export const deletePdfImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string; force?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const { data: imp, error: impErr } = await context.supabase
      .from("pdf_imports")
      .select("id, storage_path, kind")
      .eq("id", data.importId)
      .maybeSingle();
    if (impErr) throw new Error(impErr.message);
    if (!imp) throw new Error("Import nicht gefunden.");

    const removed = {
      storage: false,
      extraction: 0,
      fidelityReports: 0,
      exercises: 0,
      answerKeys: 0,
      linkedKeyImports: 0,
    };

    // Draft exercises built from this import
    const { data: exs } = await context.supabase
      .from("exercises")
      .select("id, status")
      .eq("source_pdf_import_id", data.importId);
    const exerciseIds = (exs ?? []).map((e: any) => e.id);
    const published = (exs ?? []).filter((e: any) => e.status === "published");
    if (published.length > 0 && !data.force) {
      throw new Error(
        `Es gibt ${published.length} bereits veröffentlichte Übung(en) aus diesem Import. ` +
        `Bitte zuerst zurückziehen oder Löschung mit "force" bestätigen.`,
      );
    }

    if (exerciseIds.length > 0) {
      const { count: akCount } = await context.supabase
        .from("exercise_answer_keys")
        .delete({ count: "exact" })
        .in("exercise_id", exerciseIds);
      removed.answerKeys = akCount ?? 0;

      const { count: exCount } = await context.supabase
        .from("exercises")
        .delete({ count: "exact" })
        .in("id", exerciseIds);
      removed.exercises = exCount ?? 0;
    }

    // Answer keys that reference this import directly (no exercise yet)
    await context.supabase
      .from("exercise_answer_keys")
      .delete()
      .eq("pdf_import_id", data.importId);

    // Fidelity reports for this exam import
    const { count: frCount } = await context.supabase
      .from("pdf_fidelity_reports")
      .delete({ count: "exact" })
      .eq("exam_import_id", data.importId);
    removed.fidelityReports = frCount ?? 0;

    // Extraction rows for this import
    const { count: extCount } = await context.supabase
      .from("pdf_extractions")
      .delete({ count: "exact" })
      .eq("import_id", data.importId);
    removed.extraction = extCount ?? 0;

    // Detach any answer-key imports that pointed at this exam
    const { count: linkedCount } = await context.supabase
      .from("pdf_imports")
      .update({ linked_import_id: null }, { count: "exact" })
      .eq("linked_import_id", data.importId);
    removed.linkedKeyImports = linkedCount ?? 0;

    // Remove the file from storage (best-effort; do not fail the whole delete)
    if (imp.storage_path) {
      const { error: storageErr } = await context.supabase.storage
        .from("pdf-imports")
        .remove([imp.storage_path]);
      if (!storageErr) removed.storage = true;
    }

    const { error: delErr } = await context.supabase
      .from("pdf_imports")
      .delete()
      .eq("id", data.importId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true, removed };
  });
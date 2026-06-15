import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

type ParseInput = {
  importId: string;
  text: string;
};

/** Extract question candidates from raw text using simple heuristics. */
function extractCandidates(text: string) {
  // Split into blocks by "Teil X" or numbered items "1." / "1)" at start of line.
  const lines = text.split(/\r?\n/);
  type Cand = { teil?: number; index?: number; question: string; options: string[]; answer?: string };
  const out: Cand[] = [];
  let currentTeil: number | undefined;
  let current: Cand | null = null;
  const teilRe = /^Teil\s+(\d+)/i;
  const qRe = /^\s*(\d{1,3})[.)]\s+(.+)$/;
  const optRe = /^\s*([A-Ea-e])[.)]\s+(.+)$/;

  const push = () => {
    if (current && current.question.trim().length > 0) out.push(current);
    current = null;
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    if (!line.trim()) continue;
    const t = teilRe.exec(line);
    if (t) { currentTeil = parseInt(t[1], 10); continue; }
    const q = qRe.exec(line);
    if (q) {
      push();
      current = { teil: currentTeil, index: parseInt(q[1], 10), question: q[2], options: [] };
      continue;
    }
    const o = optRe.exec(line);
    if (o && current) { current.options.push(o[2]); continue; }
    // Append continuation
    if (current) current.question += " " + line.trim();
  }
  push();
  return out;
}

export const parsePdfImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ParseInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const candidates = extractCandidates(data.text);
    const { error } = await context.supabase
      .from("pdf_imports")
      .update({
        extracted_text: data.text,
        extracted_candidates: candidates,
        status: "parsed",
      })
      .eq("id", data.importId);
    if (error) throw new Error(error.message);
    return { count: candidates.length, candidates };
  });

export const createPdfImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storagePath: string; originalName: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("pdf_imports")
      .insert({
        uploaded_by: context.userId,
        storage_path: data.storagePath,
        original_name: data.originalName,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create import");
    return { id: row.id };
  });

export const publishCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    level: "b1" | "b2";
    module: "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";
    teil: number;
    title: string;
    prompt: string;
    passage?: string | null;
    kind: "multiple_choice" | "true_false" | "cloze" | "matching" | "open_text";
    options: string[];
    correct: string[];
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("exercises")
      .insert({
        level: data.level,
        module: data.module,
        teil: data.teil,
        position: 1,
        title: data.title,
        prompt: data.prompt,
        passage: data.passage ?? null,
        kind: data.kind,
        options: data.options,
        correct: data.correct,
        status: "draft",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create exercise");
    return { id: row.id };
  });
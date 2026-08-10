import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Manual admin "add exercise" capability across every Teil in Lesen, Hören,
 * and Sprachbausteine (user request, 2026-07-27). Each function is a thin
 * wrapper: admin check in TS (same pattern as content.functions.ts), then a
 * single call into the matching atomic SECURITY DEFINER SQL function
 * (supabase/migrations/20260727060000_admin_manual_exercise_create.sql),
 * which does full validation + the multi-table insert in one transaction.
 *
 * NOTICE_TEXT is the user's standing rule (see memory
 * feedback-missing-exercise-flagging.md): exercises not previously part of
 * the Tunisia curriculum get this exact string appended to import_notes,
 * insert-only, never overwriting anything. Every form below exposes it as an
 * explicit toggle — off by default, since most manually-added content won't
 * need it (this flag is specifically for "new to Tunisia" content, not a
 * default marker for admin-created rows in general).
 */

export const NOTICE_TEXT = "هذه التمارين لم تدرج في تونس بعد، ولكن لا يجب استبعادها أبداً";

function buildImportNotes(baseNote: string, flagAsNewToTunisia: boolean): string | null {
  const base = baseNote.trim();
  if (!flagAsNewToTunisia) return base || null;
  return base ? `${base} | ${NOTICE_TEXT}` : NOTICE_TEXT;
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

type Level = "TELC_B1" | "TELC_B2";

/**
 * Optional learning-assistance content an admin can author alongside an
 * exercise (translation / evidence / explanation / grammar) — never
 * AI-generated, stored as-is on the exercise row's learning_aids JSONB
 * column. `items` is keyed by the same per-item key the exercise's scoring
 * RPC uses (position/number/gap_number/statement_number/letter/word_number,
 * as a string). Both sub-objects are optional; omit entirely when a form
 * collects nothing.
 */
export interface LearningAidsInput {
  translation?: { text?: string; questions?: Record<string, string> };
  items?: Record<string, {
    evidence_text?: string;
    evidence_translation?: string;
    keyword?: string;
    explanation_correct?: string;
    explanation_wrong?: string;
    grammar_structure?: string;
    grammar_example?: string;
    grammar_translation?: string;
  }>;
}

// ── Lesen Teil 1 ─────────────────────────────────────────────────────────────
export const createLesenT1Exercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    level: Level;
    note: string;
    flagAsNewToTunisia: boolean;
    headlines: { letter: string; text: string; is_distractor: boolean }[];
    texts: { position: number; title: string; content: string; correct_headline: string }[];
    learningAids?: LearningAidsInput | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await db.rpc("admin_create_lesen_t1_exercise", {
      p_created_by: context.userId,
      p_title: data.title,
      p_level: data.level,
      p_import_notes: buildImportNotes(data.note, data.flagAsNewToTunisia),
      p_headlines: data.headlines,
      p_texts: data.texts,
      p_learning_aids: data.learningAids ?? null,
    });
    if (error) throw new Error(error.message);
    return result as { exercise_id: string; title: string };
  });

// ── Lesen Teil 2 ─────────────────────────────────────────────────────────────
export const createLesenT2Exercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    level: Level;
    note: string;
    flagAsNewToTunisia: boolean;
    passage: string;
    questions: { number: number; question: string; option_a: string; option_b: string; option_c: string; correct: "a" | "b" | "c" }[];
    learningAids?: LearningAidsInput | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await db.rpc("admin_create_lesen_t2_exercise", {
      p_created_by: context.userId,
      p_title: data.title,
      p_level: data.level,
      p_import_notes: buildImportNotes(data.note, data.flagAsNewToTunisia),
      p_passage: data.passage,
      p_questions: data.questions,
      p_learning_aids: data.learningAids ?? null,
    });
    if (error) throw new Error(error.message);
    return result as { exercise_id: string; title: string };
  });

// ── Lesen Teil 3 ─────────────────────────────────────────────────────────────
export const createLesenT3Exercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    level: Level;
    note: string;
    flagAsNewToTunisia: boolean;
    texts: { letter: string; title: string; content: string }[];
    situations: { number: number; description: string; correct_letter: string | null; no_match: boolean }[];
    learningAids?: LearningAidsInput | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await db.rpc("admin_create_lesen_t3_exercise", {
      p_created_by: context.userId,
      p_title: data.title,
      p_level: data.level,
      p_import_notes: buildImportNotes(data.note, data.flagAsNewToTunisia),
      p_texts: data.texts,
      p_situations: data.situations,
      p_learning_aids: data.learningAids ?? null,
    });
    if (error) throw new Error(error.message);
    return result as { exercise_id: string; title: string };
  });

// ── Hören (any Teil 1/2/3) ───────────────────────────────────────────────────
export const createHoerenExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    teil: 1 | 2 | 3;
    level: Level;
    note: string;
    flagAsNewToTunisia: boolean;
    instructions: string;
    imagePath: string | null;
    audioPath: string | null;
    statements: { statement_number: number; statement_text: string; correct_answer: boolean }[];
    learningAids?: LearningAidsInput | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await db.rpc("admin_create_hoeren_exercise", {
      p_created_by: context.userId,
      p_title: data.title,
      p_teil: data.teil,
      p_level: data.level,
      p_import_notes: buildImportNotes(data.note, data.flagAsNewToTunisia),
      p_instructions: data.instructions,
      p_image_path: data.imagePath,
      p_audio_path: data.audioPath,
      p_statements: data.statements,
      p_learning_aids: data.learningAids ?? null,
    });
    if (error) throw new Error(error.message);
    return result as { exercise_id: string; title: string };
  });

// ── Sprachbausteine Teil 1 ───────────────────────────────────────────────────
export const createSbT1Exercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    level: Level;
    note: string;
    flagAsNewToTunisia: boolean;
    passage: string;
    instructions: string;
    gaps: { gap_number: number; option_a: string; option_b: string; option_c: string; correct: "a" | "b" | "c" }[];
    learningAids?: LearningAidsInput | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await db.rpc("admin_create_sb_t1_exercise", {
      p_created_by: context.userId,
      p_title: data.title,
      p_level: data.level,
      p_import_notes: buildImportNotes(data.note, data.flagAsNewToTunisia),
      p_passage: data.passage,
      p_instructions: data.instructions,
      p_gaps: data.gaps,
      p_learning_aids: data.learningAids ?? null,
    });
    if (error) throw new Error(error.message);
    return result as { exercise_id: string; title: string };
  });

// ── Sprachbausteine Teil 2 ───────────────────────────────────────────────────
export const createSbT2Exercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    level: Level;
    note: string;
    flagAsNewToTunisia: boolean;
    passage: string;
    instructions: string;
    words: { word_number: number; word: string }[];
    gaps: { gap_number: number; correct_word: string }[];
    learningAids?: LearningAidsInput | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await db.rpc("admin_create_sb_t2_exercise", {
      p_created_by: context.userId,
      p_title: data.title,
      p_level: data.level,
      p_import_notes: buildImportNotes(data.note, data.flagAsNewToTunisia),
      p_passage: data.passage,
      p_instructions: data.instructions,
      p_words: data.words,
      p_gaps: data.gaps,
      p_learning_aids: data.learningAids ?? null,
    });
    if (error) throw new Error(error.message);
    return result as { exercise_id: string; title: string };
  });

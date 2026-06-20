import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Manual exercise collections.
 *
 * The admin types the title freely; the system never invents, classifies,
 * or renames a collection. No AI calls anywhere — pure SQL only.
 */

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

export const listCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exercise_collections")
      .select("id,title,level,module,teil,notes,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // Add exercise counts in a second query so we don't depend on FK joins
    const ids = (data ?? []).map((c: any) => c.id);
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: ex } = await context.supabase
        .from("exercises")
        .select("collection_id")
        .in("collection_id", ids);
      for (const row of ex ?? []) {
        const id = (row as any).collection_id as string;
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
    return { collections: (data ?? []).map((c: any) => ({ ...c, exerciseCount: counts[c.id] ?? 0 })) };
  });

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    level?: "b1" | "b2" | null;
    module?: "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich" | null;
    teil?: number | null;
    notes?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const title = (data.title ?? "").trim();
    if (!title) throw new Error("Sammlungstitel darf nicht leer sein.");
    const { data: row, error } = await context.supabase
      .from("exercise_collections")
      .insert({
        title,
        level: data.level ?? null,
        module: data.module ?? null,
        teil: data.teil ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id,title")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Sammlung konnte nicht erstellt werden.");
    return { id: row.id, title: row.title };
  });

export const renameCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; title: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const title = (data.title ?? "").trim();
    if (!title) throw new Error("Sammlungstitel darf nicht leer sein.");
    const { error } = await context.supabase
      .from("exercise_collections")
      .update({ title })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // FK is ON DELETE SET NULL, so exercises survive — they just become ungrouped.
    const { error } = await context.supabase
      .from("exercise_collections")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveExerciseToCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string; collectionId: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("exercises")
      .update({ collection_id: data.collectionId })
      .eq("id", data.exerciseId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
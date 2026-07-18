import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin content management — rename and reorder prep exercises directly from
 * the Admin Panel, with changes saved immediately to the database and visible
 * to subscribers on their very next request (no redeploy). All writes go
 * through the service-role client after an explicit admin check, matching
 * every other admin write path in this app — so the underlying content tables
 * need NO client-facing write RLS policy (which would only widen the attack
 * surface). Only a fixed whitelist of tables/columns can be touched; the
 * `skill` key can never become an arbitrary table name.
 */

type Skill = "lesen" | "hoeren" | "sprachbausteine";

const SKILL_TABLE: Record<Skill, { table: string; orderCol: string }> = {
  lesen: { table: "lesen_exercises", orderCol: "sort_order" },
  hoeren: { table: "hoeren_exercises", orderCol: "position" },
  sprachbausteine: { table: "sb_exercises", orderCol: "position" },
};

function resolveSkill(skill: string): { table: string; orderCol: string } {
  const entry = SKILL_TABLE[skill as Skill];
  if (!entry) throw new Error(`Unknown content type "${skill}".`);
  return entry;
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

/** Admin view of a (skill, level, teil) group — every exercise, in current
 * display order, regardless of subscription (service-role read). */
export const listAdminExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { skill: string; level: string; teil: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { table, orderCol } = resolveSkill(data.skill);
    // Whitelisted table/column names (resolveSkill) — cast past the typed
    // client, which can't express a runtime-selected table/order column.
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await db
      .from(table)
      .select(`id, title, teil, level, ${orderCol}`)
      .eq("level", data.level)
      .eq("teil", data.teil)
      .order(orderCol, { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return {
      skill: data.skill,
      level: data.level,
      teil: data.teil,
      orderCol,
      rows: (rows ?? []).map((r: any) => ({ id: r.id, title: r.title, order: r[orderCol] ?? null })),
    };
  });

/** Rename one exercise. Immediate; visible to subscribers on next request. */
export const updateExerciseTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { skill: string; id: string; title: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { table } = resolveSkill(data.skill);
    const title = data.title.trim();
    if (!title) throw new Error("Title cannot be empty.");
    if (title.length > 300) throw new Error("Title is too long (max 300 characters).");
    // Whitelisted table/column names (resolveSkill) — cast past the typed
    // client, which can't express a runtime-selected table/order column.
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");

    const { error } = await db.from(table).update({ title }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id, title };
  });

/** Persist a new display order: each id's order column is set to its index in
 * the provided array (1-based), so the student listing (which orders by that
 * same column) reflects the admin's chosen sequence exactly. */
export const reorderExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { skill: string; orderedIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { table, orderCol } = resolveSkill(data.skill);
    if (!Array.isArray(data.orderedIds) || data.orderedIds.length === 0) {
      throw new Error("No ordering provided.");
    }
    // Whitelisted table/column names (resolveSkill) — cast past the typed
    // client, which can't express a runtime-selected table/order column.
    const { supabaseAdmin: db }: { supabaseAdmin: any } = await import("@/integrations/supabase/client.server");

    // Small N per (skill, level, teil) group — a sequential set of updates is
    // simplest and perfectly adequate; each row's order column becomes its
    // 1-based position in the array.
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await db.from(table).update({ [orderCol]: i + 1 }).eq("id", data.orderedIds[i]);
      if (error) throw new Error(`Failed to reorder: ${error.message}`);
    }
    return { updated: data.orderedIds.length };
  });

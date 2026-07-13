import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Real role management, backed by the user_roles table that has_role()/
 * assertAdmin() actually read — replaces a prior admin.roles.tsx that wrote
 * to profiles.role, a column nothing in the app's authorization logic ever
 * consults. That page was both non-functional (role changes there had zero
 * real effect) and, combined with a missing WITH CHECK on profiles' RLS
 * UPDATE policy, a dormant self-escalation hole (closed separately via
 * 20260715010000_d17_v4_role_escalation_guard.sql's trigger). user_roles
 * itself has zero INSERT/UPDATE/DELETE policies for authenticated/anon —
 * grants/revokes can only happen through the service-role client, i.e.
 * only through this admin-gated server function.
 */

const ROLE_VALUES = ["admin", "student", "super_admin", "owner"] as const;
type Role = (typeof ROLE_VALUES)[number];

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

/** All users with their current role set (a user can hold multiple roles —
 * user_roles is a many-rows-per-user table, not a single-role column). */
export const listUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name").order("full_name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const rolesByUser = new Map<string, Role[]>();
    for (const r of roles ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role as Role);
      rolesByUser.set(r.user_id, list);
    }

    return (profiles ?? []).map((p: { id: string; full_name: string | null }) => ({
      id: p.id,
      full_name: p.full_name,
      roles: rolesByUser.get(p.id) ?? [],
    }));
  });

export const adminGrantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; role: Role }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!ROLE_VALUES.includes(data.role)) throw new Error(`Unknown role "${data.role}".`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { granted: data.role };
  });

export const adminRevokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; role: Role }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId && (data.role === "admin" || data.role === "super_admin")) {
      throw new Error("You cannot revoke your own admin access — ask another admin to do it.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    if (error) throw new Error(error.message);
    return { revoked: data.role };
  });

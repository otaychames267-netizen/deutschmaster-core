import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listUserRoles, adminGrantRole, adminRevokeRole } from "@/lib/admin/user-roles.functions";
import { Shield, Crown, User, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  component: RolesPage,
});

const ROLE_VALUES = ["owner", "super_admin", "admin", "student"] as const;
type Role = (typeof ROLE_VALUES)[number];

interface UserRoleRow {
  id: string;
  full_name: string | null;
  roles: Role[];
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  owner:       { label: "Owner",       color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",   icon: Crown  },
  super_admin: { label: "Super Admin", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30",       icon: Shield },
  admin:       { label: "Admin",       color: "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-violet-500/30", icon: Shield },
  student:     { label: "Student",     color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30",       icon: User   },
};

function RolesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUserRoles({ data: undefined });
      setRows(data as UserRoleRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function grant(userId: string, role: Role) {
    const key = `${userId}-${role}`;
    setBusyKey(key);
    try {
      await adminGrantRole({ data: { user_id: userId, role } });
      setRows((prev) => prev.map((r) => (r.id === userId && !r.roles.includes(role) ? { ...r, roles: [...r.roles, role] } : r)));
      toast.success(`Granted ${ROLE_CONFIG[role].label}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to grant role.");
    } finally {
      setBusyKey(null);
    }
  }

  async function revoke(userId: string, role: Role) {
    const key = `${userId}-${role}`;
    setBusyKey(key);
    try {
      await adminRevokeRole({ data: { user_id: userId, role } });
      setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, roles: r.roles.filter((x) => x !== role) } : r)));
      toast.success(`Revoked ${ROLE_CONFIG[role].label}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke role.");
    } finally {
      setBusyKey(null);
    }
  }

  const stats = Object.fromEntries(ROLE_VALUES.map((r) => [r, rows.filter((row) => row.roles.includes(r)).length]));
  const staffOnly = rows.filter((r) => r.roles.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant or revoke staff roles. Backed by the same <code>user_roles</code> table every admin check in this app
          actually reads — a user with no roles here is a plain student, regardless of anything else.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {ROLE_VALUES.map((role) => {
          const cfg = ROLE_CONFIG[role];
          return (
            <div key={role} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${cfg.color}`}>
                  <cfg.icon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </div>
              <p className="text-2xl font-black text-foreground">{stats[role] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{role === "student" ? "N/A — implicit default" : "users"}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-black text-foreground">Staff (users with at least one elevated role)</h2>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : staffOnly.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No staff roles assigned yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {staffOnly.map((r) => {
              const isSelf = r.id === user?.id;
              const availableToGrant = ROLE_VALUES.filter((role) => role !== "student" && !r.roles.includes(role));
              return (
                <div key={r.id} className="flex flex-col gap-2 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
                      {(r.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.id}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.roles.filter((role) => role !== "student").map((role) => {
                      const cfg = ROLE_CONFIG[role];
                      const key = `${r.id}-${role}`;
                      return (
                        <span key={role} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${cfg.color}`}>
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                          {!isSelf && (
                            <button
                              onClick={() => revoke(r.id, role)}
                              disabled={busyKey === key}
                              title={`Revoke ${cfg.label}`}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 disabled:opacity-50"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                    {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    {!isSelf && availableToGrant.length > 0 && (
                      <select
                        value=""
                        disabled={busyKey !== null}
                        onChange={(e) => e.target.value && grant(r.id, e.target.value as Role)}
                        className="appearance-none rounded-lg border border-dashed border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      >
                        <option value="">
                          <Plus className="h-3 w-3" /> Grant…
                        </option>
                        {availableToGrant.map((role) => (
                          <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-black text-foreground">Grant a role to any user</h2>
        <GrantByIdForm rows={rows} onGrant={grant} />
      </div>
    </div>
  );
}

function GrantByIdForm({ rows, onGrant }: { rows: UserRoleRow[]; onGrant: (userId: string, role: Role) => Promise<void> }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = userId.trim();
    if (!trimmed) {
      toast.error("Enter a user ID.");
      return;
    }
    if (!rows.some((r) => r.id === trimmed)) {
      toast.error("No user found with that ID.");
      return;
    }
    setBusy(true);
    try {
      await onGrant(trimmed, role);
      setUserId("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="User ID (uuid) — find it on the Users page"
        className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
      >
        {ROLE_VALUES.filter((r) => r !== "student").map((r) => (
          <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
        ))}
      </select>
      <button
        onClick={submit}
        disabled={busy}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Grant
      </button>
    </div>
  );
}

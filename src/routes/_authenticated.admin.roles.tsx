import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Crown, User, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  component: RolesPage,
});

interface Profile {
  id: string;
  full_name: string | null;
  email?: string;
  role: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  owner:       { label: "Owner",       color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",   icon: Crown  },
  super_admin: { label: "Super Admin", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30",       icon: Shield },
  admin:       { label: "Admin",       color: "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-violet-500/30", icon: Shield },
  student:     { label: "Student",     color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30",       icon: User   },
};

function RolesPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("role")
      .then(({ data }) => {
        setProfiles(data ?? []);
        setLoading(false);
      });
  }, []);

  async function changeRole(userId: string, newRole: string) {
    if (userId === user?.id) return; // can't change own role
    setSaving(userId);
    await supabase.from("profiles").update({ role: newRole as "admin" | "student" | "super_admin" | "owner" }).eq("id", userId);
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
    setSaving(null);
  }

  const stats = Object.fromEntries(
    Object.keys(ROLE_CONFIG).map(r => [r, profiles.filter(p => p.role === r).length])
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Assign and manage user roles across the platform.</p>
      </div>

      {/* Role stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <div key={role} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${cfg.color}`}>
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
            <p className="text-2xl font-black text-foreground">{stats[role] ?? 0}</p>
            <p className="text-xs text-muted-foreground">users</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-black text-foreground">All users</h2>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="divide-y divide-border">
            {profiles.map(p => {
              const cfg = ROLE_CONFIG[p.role] ?? ROLE_CONFIG.student;
              const isSelf = p.id === user?.id;
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
                      {(p.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${cfg.color}`}>
                      <cfg.icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    {!isSelf && (
                      <div className="relative">
                        <select
                          value={p.role}
                          disabled={saving === p.id}
                          onChange={e => changeRole(p.id, e.target.value)}
                          className="appearance-none rounded-lg border border-border bg-muted px-3 py-1.5 pr-7 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                        >
                          {Object.entries(ROLE_CONFIG).map(([r, c]) => (
                            <option key={r} value={r}>{c.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    )}
                    {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

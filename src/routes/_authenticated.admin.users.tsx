import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, ChevronLeft, ChevronRight as ChevronRightIcon,
  Filter, MoreHorizontal, UserCheck, UserX, ShieldCheck,
  RefreshCw, Mail,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

interface UserRow {
  id: string;
  full_name: string | null;
  level: string | null;
  is_admin: boolean;
  is_banned: boolean;
  onboarding_completed: boolean;
  created_at: string;
  subscriptions: { status: string; plan_code: string }[];
}

const PAGE_SIZE = 20;

function badge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active:  { label: "Active",  cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    trial:   { label: "Trial",   cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    expired: { label: "Expired", cls: "bg-muted text-muted-foreground" },
    banned:  { label: "Banned",  cls: "bg-destructive/10 text-destructive" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function AdminUsersPage() {
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [search, setSearch]     = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [loading, setLoading]   = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("profiles")
      .select(
        `id, full_name, level, is_admin, is_banned, onboarding_completed, created_at,
         subscriptions(status, plan_code)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.ilike("full_name", `%${search.trim()}%`);
    }
    if (filterLevel !== "all") {
      query = query.eq("level", filterLevel);
    }

    const { data, count } = await query;
    setUsers((data as unknown as UserRow[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search, filterLevel]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleBan(userId: string, currentBan: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !currentBan })
      .eq("id", userId);
    if (error) { toast.error("Failed to update user."); return; }
    toast.success(currentBan ? "User unbanned." : "User banned.");
    fetchUsers();
  }

  async function toggleAdmin(userId: string, currentAdmin: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentAdmin })
      .eq("id", userId);
    if (error) { toast.error("Failed to update user."); return; }
    toast.success(currentAdmin ? "Admin revoked." : "Admin granted.");
    fetchUsers();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = page * PAGE_SIZE + 1;
  const end   = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} registered accounts</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filterLevel}
            onChange={(e) => { setFilterLevel(e.target.value); setPage(0); }}
            className="rounded-xl border border-input bg-background py-2.5 pl-9 pr-8 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All levels</option>
            <option value="TELC_B1">TELC B1</option>
            <option value="TELC_B2">TELC B2</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Subscription</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading users…
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const sub = u.subscriptions?.[0];
                  const rowStatus = u.is_banned ? "banned" : sub?.status ?? "none";
                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {(u.full_name?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[160px]">
                              {u.full_name ?? <span className="text-muted-foreground italic">No name</span>}
                            </p>
                            {u.is_admin && (
                              <span className="flex items-center gap-1 text-xs text-primary">
                                <ShieldCheck className="h-3 w-3" /> Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {u.level === "TELC_B1" ? "B1" : u.level === "TELC_B2" ? "B2" : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {sub ? <span className="capitalize">{sub.plan_code}</span> : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {badge(rowStatus)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2" disabled>
                              <Mail className="h-3.5 w-3.5" /> Send email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => toggleAdmin(u.id, u.is_admin)}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {u.is_admin ? "Revoke admin" : "Make admin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={`gap-2 ${u.is_banned ? "" : "text-destructive focus:text-destructive"}`}
                              onClick={() => toggleBan(u.id, u.is_banned)}
                            >
                              {u.is_banned ? (
                                <><UserCheck className="h-3.5 w-3.5" /> Unban user</>
                              ) : (
                                <><UserX className="h-3.5 w-3.5" /> Ban user</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {start}–{end} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

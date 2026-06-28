import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, ChevronLeft, ChevronRight as ChevronRightIcon,
  RefreshCw, Filter, CreditCard, Clock, CheckCircle2, XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});

interface SubRow {
  id: string;
  user_id: string;
  status: string;
  plan_code: string;
  expires_at: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  active:  { label: "Active",  icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  trial:   { label: "Trial",   icon: Clock,        cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400"         },
  expired: { label: "Expired", icon: XCircle,      cls: "bg-muted text-muted-foreground"                           },
  cancelled: { label: "Cancelled", icon: XCircle,  cls: "bg-destructive/10 text-destructive"                       },
};

function SubBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: CreditCard, cls: "bg-muted text-muted-foreground" };
  const IconComp = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <IconComp className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

function AdminSubscriptionsPage() {
  const [subs, setSubs]         = useState<SubRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading]   = useState(true);

  const fetchSubs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("subscriptions")
      .select("id, user_id, status, plan_code, expires_at, created_at, profiles(full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus as "expired" | "trial" | "active" | "cancelled" | "suspended");
    }

    const { data, count } = await query;
    setSubs((data as unknown as SubRow[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filterStatus]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  /* Summary counts */
  const [counts, setCounts] = useState({ active: 0, trial: 0, expired: 0 });
  useEffect(() => {
    Promise.all([
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trial"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"),
    ]).then(([a, t, e]) => setCounts({ active: a.count ?? 0, trial: t.count ?? 0, expired: e.count ?? 0 }));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} total records</p>
        </div>
        <button
          onClick={fetchSubs}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Active",  count: counts.active,  cls: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
          { label: "Trial",   count: counts.trial,   cls: "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400"             },
          { label: "Expired", count: counts.expired, cls: "border-border bg-muted text-muted-foreground"                                   },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${s.cls}`}>
            <span className="text-lg font-bold">{s.count}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
            className="rounded-xl border border-input bg-background py-2.5 pl-9 pr-8 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : subs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                subs.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {(s.profiles?.full_name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {s.profiles?.full_name ?? <span className="text-muted-foreground italic text-xs">{s.user_id.slice(0, 8)}…</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize font-medium text-foreground">{s.plan_code}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <SubBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {s.expires_at
                        ? new Date(s.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border disabled:opacity-40"
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

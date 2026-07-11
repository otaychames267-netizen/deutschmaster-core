import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Mic, Plus, Search, TrendingUp, TrendingDown, Users, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { forceProvisionSubscription } from "@/lib/admin/force-provision.functions";

export const Route = createFileRoute("/_authenticated/admin/muendlich-credits")({
  component: AdminMuendlichCreditsPage,
});

interface StudentHit {
  id: string;
  full_name: string | null;
  email: string | null;
  minutes_balance: number;
}

interface TxRow {
  id: string;
  delta_minutes: number;
  reason: string;
  created_at: string;
  user_id: string;
  student_email: string | null;
  student_name: string | null;
}

const PLAN_CODES = ["schriftlich", "muendlich", "komplett"] as const;

function AdminMuendlichCreditsPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [selected, setSelected] = useState<StudentHit | null>(null);
  const [minutes, setMinutes] = useState("300");
  const [note, setNote] = useState("");
  const [granting, setGranting] = useState(false);

  const [forcePlan, setForcePlan] = useState<(typeof PLAN_CODES)[number]>("muendlich");
  const [forcing, setForcing] = useState(false);

  const [stats, setStats] = useState({ granted: 0, spent: 0, activeStudents: 0 });
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  const loadStats = useCallback(async () => {
    setLoadingTx(true);
    const [{ data: txData }, { data: activeData }] = await Promise.all([
      supabase
        .from("muendlich_credit_transactions")
        .select("id, delta_minutes, reason, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.from("muendlich_credits").select("user_id").gt("minutes_balance", 0),
    ]);

    let granted = 0, spent = 0;
    const { data: allTx } = await supabase.from("muendlich_credit_transactions").select("delta_minutes");
    for (const t of allTx ?? []) {
      if (t.delta_minutes > 0) granted += t.delta_minutes;
      else spent += Math.abs(t.delta_minutes);
    }
    setStats({ granted, spent, activeStudents: activeData?.length ?? 0 });

    if (txData && txData.length > 0) {
      const userIds = [...new Set(txData.map((t) => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      setTransactions(
        txData.map((t) => ({
          ...t,
          student_email: byId.get(t.user_id)?.email ?? null,
          student_name: byId.get(t.user_id)?.full_name ?? null,
        })),
      );
    } else {
      setTransactions([]);
    }
    setLoadingTx(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSelected(null);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(8);

    if (!profiles || profiles.length === 0) {
      setHits([]);
      setSearching(false);
      return;
    }
    const ids = profiles.map((p) => p.id);
    const { data: balances } = await supabase.from("muendlich_credits").select("user_id, minutes_balance").in("user_id", ids);
    const balanceMap = new Map((balances ?? []).map((b) => [b.user_id, b.minutes_balance]));
    setHits(profiles.map((p) => ({ id: p.id, full_name: p.full_name, email: p.email, minutes_balance: balanceMap.get(p.id) ?? 0 })));
    setSearching(false);
  }

  async function handleGrant() {
    if (!selected) return;
    const amt = parseInt(minutes, 10);
    if (!Number.isInteger(amt) || amt <= 0) {
      toast.error("Enter a positive whole number of minutes.");
      return;
    }
    setGranting(true);
    const { data: newBalance, error } = await supabase.rpc("admin_grant_muendlich_minutes", {
      p_user_id: selected.id,
      p_minutes: amt,
      p_note: note.trim() || "admin_grant",
    });
    setGranting(false);
    if (error) {
      toast.error(`Failed to grant minutes: ${error.message}`);
      return;
    }
    toast.success(`Granted ${amt} minutes to ${selected.email ?? selected.full_name}. New balance: ${newBalance}.`);
    setSelected({ ...selected, minutes_balance: newBalance as number });
    setNote("");
    loadStats();
  }

  async function handleForceProvision() {
    if (!selected) return;
    setForcing(true);
    try {
      const result = await forceProvisionSubscription({
        data: { student_id: selected.id, plan_code: forcePlan, note: note.trim() || undefined },
      });
      toast.success(
        `Force-activated ${forcePlan} for ${selected.email ?? selected.full_name}.` +
          (result.minutes !== undefined ? ` Minutes: ${result.minutes}.` : "") +
          (result.credits !== undefined ? ` Essay credits: ${result.credits}.` : ""),
      );
      loadStats();
      handleSearch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Force-provision failed.");
    } finally {
      setForcing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
            <Mic className="h-5 w-5 text-rose-500" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Mündlich Minutes</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">Grant students Room 2 (AI oral exam) minutes. Manual top-up, or force-activate a subscription if a Lemon Squeezy webhook needs reconciliation.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total minutes granted", value: stats.granted, icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Total minutes spent", value: stats.spent, icon: TrendingDown, color: "text-blue-500 bg-blue-500/10" },
          { label: "Students with balance", value: stats.activeStudents, icon: Users, color: "text-violet-500 bg-violet-500/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color.split(" ")[1]}`}>
                <Icon className={`h-4 w-4 ${color.split(" ")[0]}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Search + grant form */}
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
        <p className="font-bold text-foreground mb-4">Manage a student's Mündlich minutes</p>

        <div className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by email or name…"
            className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>

        {hits.length > 0 && !selected && (
          <div className="mb-4 space-y-1.5">
            {hits.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelected(h)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm hover:border-rose-500/40 transition-colors"
              >
                <span>
                  <span className="font-medium text-foreground">{h.full_name ?? "—"}</span>
                  <span className="text-muted-foreground"> · {h.email}</span>
                </span>
                <span className="text-xs font-semibold text-rose-600">{h.minutes_balance} min</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{selected.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current balance</p>
                <p className="text-sm font-bold text-rose-600">{selected.minutes_balance} min</p>
              </div>
              <button onClick={() => { setSelected(null); setHits([]); setQuery(""); }} className="ml-4 text-xs text-muted-foreground hover:text-foreground">
                Change
              </button>
            </div>

            {/* Manual top-up (existing admin_grant_muendlich_minutes RPC — capped, additive) */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Manual top-up</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Minutes to grant (max 300)</label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Note (optional)</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. support ticket #123"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleGrant}
                  disabled={granting}
                  className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-600 transition-colors disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" /> Grant minutes
                </button>
              </div>
            </div>

            {/* Force-provision (hard-reset, mirrors what the Lemon Squeezy webhook does) */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Force-provision from subscription</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Use only if a Lemon Squeezy webhook failed or needs manual reconciliation. Activates the subscription and hard-resets the
                wallet(s) to the plan's full per-cycle amount (300 min / 30 essay credits) — this OVERWRITES the current balance, it does not add to it.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={forcePlan}
                  onChange={(e) => setForcePlan(e.target.value as typeof forcePlan)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  {PLAN_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
                <button
                  onClick={handleForceProvision}
                  disabled={forcing}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
                >
                  <ShieldAlert className="h-4 w-4" /> Force-provision
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <p className="text-sm font-bold text-foreground">Recent activity</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Student", "Change", "Reason", "When"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingTx ? (
                <tr><td colSpan={4} className="px-6 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-6 text-center text-muted-foreground">No activity yet.</td></tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-foreground">{t.student_name ?? "—"}</span>
                      <span className="text-muted-foreground"> · {t.student_email}</span>
                    </td>
                    <td className={`px-6 py-3.5 font-semibold ${t.delta_minutes > 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {t.delta_minutes > 0 ? `+${t.delta_minutes}` : t.delta_minutes}
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground text-xs">{t.reason}</td>
                    <td className="px-6 py-3.5 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

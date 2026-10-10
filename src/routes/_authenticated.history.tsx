import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  History, CheckCircle2, XCircle,
  BookOpen, X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

/** Unified attempt row spanning exam results and Lesen practice attempts. */
interface UnifiedRow {
  id: string;
  source: "exam" | "lesen";
  section: string;        // "lesen", "hoeren", … (for filtering)
  label: string;          // "Lesen", "Lesen · Teil 2", …
  detail?: string | null; // exercise title (Lesen practice)
  score: number;
  max: number;
  passed: boolean;
  created_at: string;
}

type FilterType = "all" | "passed" | "failed";

const SECTION_LABELS: Record<string, string> = {
  lesen:           "Lesen",
  hoeren:          "Hören",
  schreiben:       "Schreiben",
  sprachbausteine: "Sprachbausteine",
};

const PASS_RATIO = 0.6; // TELC pass threshold

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function HistoryPage() {
  const { user } = useAuth();
  const [rows, setRows]           = useState<UnifiedRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FilterType>("all");
  const [sectionFilter, setSect]  = useState("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const [examRes, lesenRes] = await Promise.all([
        supabase
          .from("attempt_results")
          .select("id, section, score, max_score, passed, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(200),
        // lesen_attempts is a newer table — cast to bypass generated types.
        (supabase as any)
          .from("lesen_attempts")
          .select("id, score, total, teil, created_at, lesen_exercises(title)")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      const examRows: UnifiedRow[] = (examRes.data ?? []).map((r: any) => ({
        id: r.id, source: "exam", section: r.section,
        label: SECTION_LABELS[r.section] ?? r.section,
        score: r.score, max: r.max_score, passed: r.passed, created_at: r.created_at,
      }));

      const lesenRows: UnifiedRow[] = (lesenRes.data ?? []).map((r: any) => {
        const ex = Array.isArray(r.lesen_exercises) ? r.lesen_exercises[0] : r.lesen_exercises;
        return {
          id: r.id, source: "lesen", section: "lesen",
          label: `Lesen · Teil ${r.teil}`,
          detail: ex?.title || null,
          score: r.score, max: r.total,
          passed: r.total > 0 && r.score / r.total >= PASS_RATIO,
          created_at: r.created_at,
        };
      });

      const all = [...examRows, ...lesenRows].sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (!cancelled) { setRows(all); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filtered = rows.filter((r) => {
    if (filter === "passed" && !r.passed) return false;
    if (filter === "failed" && r.passed)  return false;
    if (sectionFilter !== "all" && r.section !== sectionFilter) return false;
    return true;
  });

  const passedCount = rows.filter((r) => r.passed).length;
  const failedCount = rows.filter((r) => !r.passed).length;
  const avgScore = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.max ? (r.score / r.max) * 100 : 0), 0) / rows.length)
    : null;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-8">
        <div className="space-y-2"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-60" /></div>
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Learning History</h1>
        <p className="text-sm text-muted-foreground">All your completed exercises and exam results, including Lesen practice.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",  value: rows.length,  color: "text-blue-500"    },
          { label: "Passed", value: passedCount,  color: "text-emerald-500" },
          { label: "Failed", value: failedCount,  color: "text-rose-500"    },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-border bg-card p-1 gap-1">
          {(["all", "passed", "failed"] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>

        <select value={sectionFilter} onChange={(e) => setSect(e.target.value)}
          className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring/20">
          <option value="all">All sections</option>
          {Object.entries(SECTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {(filter !== "all" || sectionFilter !== "all") && (
          <button onClick={() => { setFilter("all"); setSect("all"); }}
            className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3 w-3" /> Clear
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} results</span>
      </div>

      {/* Results list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <History className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">No results found</p>
          <p className="text-xs text-muted-foreground">Complete some exercises to build your history.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Exercise</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Score</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Result</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Date &amp; time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => {
                  const pct = r.max ? Math.round((r.score / r.max) * 100) : 0;
                  return (
                    <tr key={`${r.source}-${r.id}`} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <span className="font-medium text-foreground">{r.label}</span>
                            {r.detail && <span className="block truncate text-xs text-muted-foreground">{r.detail}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden sm:flex h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full ${pct >= 60 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`font-semibold ${pct >= 60 ? "text-emerald-500" : "text-rose-500"}`}>
                            {r.score}/{r.max}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.passed ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500">
                            <XCircle className="h-3 w-3" /> Fail
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {avgScore !== null && (
            <div className="border-t border-border bg-muted/20 px-5 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Average score across all attempts</span>
              <span className={`font-bold ${avgScore >= 60 ? "text-emerald-500" : "text-rose-500"}`}>{avgScore}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

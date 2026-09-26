/**
 * "Meine Wörter & Ausdrücke" — the student's personal saved-vocabulary
 * dashboard. Reads/writes only saved_expressions rows owned by the current
 * user (RLS enforces user_id = auth.uid() regardless of what the client
 * asks for). Includes a lightweight "🧠 Wiederholen" recall flow — a single
 * card flip, not spaced repetition, per explicit scope decision.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_LABELS, type SavedExpressionCategory } from "@/components/learning/types";
import {
  Search, Trash2, CheckCircle2, Circle, Loader2, BookMarked,
  Brain, ChevronLeft, ChevronRight, X, Eye,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/woerter")({
  component: WoerterPage,
});

interface SavedExpressionRow {
  id: string;
  skill: "lesen" | "hoeren" | "sprachbausteine";
  exercise_id: string | null;
  item_key: string | null;
  category: SavedExpressionCategory;
  german: string;
  grammar: string | null;
  translation: string | null;
  explanation: string | null;
  example: string | null;
  is_learned: boolean;
  created_at: string;
}

const SKILL_LABELS: Record<string, string> = { lesen: "Lesen", hoeren: "Hören", sprachbausteine: "Sprachbausteine" };

function WoerterPage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<SavedExpressionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SavedExpressionCategory | "all">("all");
  const [learnedFilter, setLearnedFilter] = useState<"all" | "learned" | "open">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (supabase as any)
      .from("saved_expressions")
      .select("id, skill, exercise_id, item_key, category, german, grammar, translation, explanation, example, is_learned, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }: { data: SavedExpressionRow[] | null; error: unknown }) => {
        if (cancelled) return;
        if (error) { console.error("Konnte gespeicherte Ausdrücke nicht laden:", error); setRows([]); }
        else setRows(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  async function toggleLearned(row: SavedExpressionRow) {
    const next = !row.is_learned;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_learned: next } : r)));
    const { error } = await (supabase as any).from("saved_expressions").update({ is_learned: next }).eq("id", row.id);
    if (error) {
      console.error("Update failed:", error);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_learned: !next } : r)));
      toast.error("Änderung konnte nicht gespeichert werden.");
    }
  }

  async function deleteRow(row: SavedExpressionRow) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== row.id));
    const { error } = await (supabase as any).from("saved_expressions").delete().eq("id", row.id);
    if (error) {
      console.error("Delete failed:", error);
      setRows(prev);
      toast.error("Löschen fehlgeschlagen.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (learnedFilter === "learned" && !r.is_learned) return false;
      if (learnedFilter === "open" && r.is_learned) return false;
      if (!q) return true;
      return (
        r.german.toLowerCase().includes(q) ||
        (r.translation ?? "").toLowerCase().includes(q) ||
        (r.explanation ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, categoryFilter, learnedFilter]);

  const learnedCount = rows.filter((r) => r.is_learned).length;

  if (authLoading || loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-foreground">
            <BookMarked className="h-6 w-6 text-primary" /> Meine Wörter &amp; Ausdrücke
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} gespeichert · {learnedCount} gelernt
          </p>
        </div>
        {rows.length > 0 && (
          <button
            onClick={() => setReviewOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
          >
            <Brain className="h-4 w-4" /> Wiederholen
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <BookMarked className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">Noch nichts gespeichert</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Klicke bei einer Übung auf „💾 Ausdruck speichern", um Wörter und Ausdrücke hier zu sammeln.
          </p>
        </div>
      ) : (
        <>
          {/* Search + filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen…"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>Alle Kategorien</FilterChip>
              {(Object.entries(CATEGORY_LABELS) as [SavedExpressionCategory, string][]).map(([value, label]) => (
                <FilterChip key={value} active={categoryFilter === value} onClick={() => setCategoryFilter(value)}>{label}</FilterChip>
              ))}
              <span className="mx-1 h-4 w-px bg-border" />
              <FilterChip active={learnedFilter === "all"} onClick={() => setLearnedFilter("all")}>Alle</FilterChip>
              <FilterChip active={learnedFilter === "open"} onClick={() => setLearnedFilter("open")}>Noch zu lernen</FilterChip>
              <FilterChip active={learnedFilter === "learned"} onClick={() => setLearnedFilter("learned")}>Gelernt</FilterChip>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2.5">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Keine Treffer für diese Filter.</p>
            )}
            {filtered.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <div key={row.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleLearned(row); }}
                      className="shrink-0"
                      title={row.is_learned ? "Als nicht gelernt markieren" : "Als gelernt markieren"}
                    >
                      {row.is_learned
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        : <Circle className="h-5 w-5 text-muted-foreground/40" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-bold ${row.is_learned ? "text-muted-foreground line-through" : "text-foreground"}`}>{row.german}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_LABELS[row.category] ?? row.category}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {SKILL_LABELS[row.skill] ?? row.skill}
                        </span>
                      </div>
                      {row.translation && !expanded && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="rtl">{row.translation}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteRow(row); }}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </button>

                  {expanded && (
                    <div className="space-y-2.5 border-t border-border bg-muted/10 px-4 py-3.5">
                      {row.translation && (
                        <Field label="Übersetzung" value={row.translation} dir="rtl" />
                      )}
                      {row.grammar && <Field label="Grammatik" value={row.grammar} />}
                      {row.explanation && <Field label="Erklärung" value={row.explanation} />}
                      {row.example && <Field label="Beispiel" value={row.example} italic />}
                      {!row.translation && !row.grammar && !row.explanation && !row.example && (
                        <p className="text-xs text-muted-foreground">Keine weiteren Details gespeichert.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {reviewOpen && <ReviewFlow rows={rows} onClose={() => setReviewOpen(false)} onMarkLearned={toggleLearned} />}
    </div>
  );
}

function Field({ label, value, dir, italic }: { label: string; value: string; dir?: "rtl"; italic?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm text-foreground leading-relaxed ${italic ? "italic" : ""}`} dir={dir}>{value}</p>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * "🧠 Wiederholen" — deliberately simple: German prompt → try to recall →
 * reveal → next. No scheduling, no spaced-repetition intervals, per explicit
 * scope decision (don't overcomplicate unless the architecture cleanly
 * supports it — it doesn't yet).
 */
function ReviewFlow({ rows, onClose, onMarkLearned }: { rows: SavedExpressionRow[]; onClose: () => void; onMarkLearned: (row: SavedExpressionRow) => void }) {
  const deck = useMemo(() => rows.filter((r) => !r.is_learned).length > 0 ? rows.filter((r) => !r.is_learned) : rows, [rows]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = deck[index];

  function next() {
    setRevealed(false);
    setIndex((i) => (i + 1) % deck.length);
  }
  function prev() {
    setRevealed(false);
    setIndex((i) => (i - 1 + deck.length) % deck.length);
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-black text-foreground">
            <Brain className="h-4 w-4 text-primary" /> Wiederholen — {index + 1} / {deck.length}
          </p>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-8 text-center min-h-[180px] flex flex-col items-center justify-center">
          <span className="mb-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[current.category] ?? current.category}
          </span>
          <p className="text-xl font-black text-foreground">{current.german}</p>

          {revealed ? (
            <div className="mt-4 w-full space-y-2 text-left">
              {current.translation && <Field label="Übersetzung" value={current.translation} dir="rtl" />}
              {current.grammar && <Field label="Grammatik" value={current.grammar} />}
              {current.explanation && <Field label="Erklärung" value={current.explanation} />}
              {current.example && <Field label="Beispiel" value={current.example} italic />}
              {!current.translation && !current.grammar && !current.explanation && !current.example && (
                <p className="text-center text-xs text-muted-foreground">Keine weiteren Details gespeichert.</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/15"
            >
              <Eye className="h-4 w-4" /> Antwort zeigen
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={prev} className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/70">
            <ChevronLeft className="h-3.5 w-3.5" /> Zurück
          </button>
          {revealed && !current.is_learned && (
            <button
              onClick={() => onMarkLearned(current)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Gelernt
            </button>
          )}
          <button onClick={next} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
            Weiter <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

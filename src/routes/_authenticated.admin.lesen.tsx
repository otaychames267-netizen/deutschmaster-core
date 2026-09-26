import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ChevronRight, Loader2, Save, Trash2, Search, BookOpen, AlertCircle, RotateCcw, Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/lesen")({
  component: AdminLesenPage,
});

interface LesenExercise {
  id: string;
  title: string;
  teil: number;
  source_pdf: string | null;
  created_at: string;
}

function AdminLesenPage() {
  const [rows, setRows]       = useState<LesenExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [teilFilter, setTeil] = useState<0 | 1 | 2 | 3>(0);
  const [search, setSearch]   = useState("");
  const [edits, setEdits]     = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    const { data, error: err } = await supabase
      .from("lesen_exercises")
      .select("id, title, teil, source_pdf, created_at")
      .order("teil")
      .order("created_at");
    if (err) { setError(true); setLoading(false); return; }
    setRows((data as LesenExercise[]) ?? []);
    setEdits({});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (teilFilter !== 0 && r.teil !== teilFilter) return false;
    if (search && !(`${r.title} ${r.source_pdf ?? ""}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [rows, teilFilter, search]);

  const countsByTeil = useMemo(() => {
    const c: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const r of rows) c[r.teil] = (c[r.teil] ?? 0) + 1;
    return c;
  }, [rows]);

  async function saveTitle(id: string) {
    const title = edits[id];
    if (title === undefined) return;
    setSaving(id);
    const { error: err } = await supabase.from("lesen_exercises").update({ title }).eq("id", id);
    setSaving(null);
    if (err) { toast.error("Title konnte nicht gespeichert werden."); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, title } : r)));
    setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
    toast.success("Titel gespeichert.");
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Übung wirklich löschen?\n\n"${title || "(ohne Titel)"}"\n\nDies entfernt auch alle zugehörigen Texte/Fragen.`)) return;
    setDeleting(id);
    const { error: err } = await supabase.from("lesen_exercises").delete().eq("id", id);
    setDeleting(null);
    if (err) { toast.error("Löschen fehlgeschlagen."); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Übung gelöscht.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-semibold">Lesen — Übungen verwalten</span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-foreground">Lesen — Übungen verwalten</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Titel manuell bearbeiten oder Übungen löschen. Teil 1: {countsByTeil[1]} · Teil 2: {countsByTeil[2]} · Teil 3: {countsByTeil[3]}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-border bg-card p-1 gap-1">
          {([0, 1, 2, 3] as const).map((t) => (
            <button key={t} onClick={() => setTeil(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                teilFilter === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t === 0 ? "Alle" : `Teil ${t}`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titel oder PDF suchen…"
            className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} Übungen</span>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
          <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-rose-500" /><p className="text-sm text-rose-700 dark:text-rose-300">Übungen konnten nicht geladen werden.</p></div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300"><RotateCcw className="h-3.5 w-3.5" /> Erneut</button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {filtered.map((r) => {
            const editing = edits[r.id] !== undefined;
            const value = editing ? edits[r.id] : r.title;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400">T{r.teil}</span>
                <div className="flex-1 min-w-0">
                  <input
                    value={value}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="(ohne Titel)"
                    className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-foreground hover:border-input focus:border-input focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {r.source_pdf && <p className="px-2 text-[11px] text-muted-foreground truncate">{r.source_pdf}</p>}
                </div>
                {editing && (
                  <button onClick={() => saveTitle(r.id)} disabled={saving === r.id}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {saving === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Speichern
                  </button>
                )}
                {!editing && <Check className="h-4 w-4 shrink-0 text-emerald-500/40" />}
                <button onClick={() => remove(r.id, r.title)} disabled={deleting === r.id}
                  className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition-colors disabled:opacity-50">
                  {deleting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <BookOpen className="h-9 w-9 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Keine Übungen gefunden.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

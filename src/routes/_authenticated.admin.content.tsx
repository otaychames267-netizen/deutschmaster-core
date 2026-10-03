import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listAdminExercises, updateExerciseTitle, reorderExercises, bulkSetNotice } from "@/lib/admin/content.functions";
import { NOTICE_TEXT } from "@/lib/admin/exercise-create.functions";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Pencil, Check, X, ArrowUp, ArrowDown, Save, GripVertical, ListOrdered, Flag, FlagOff,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: AdminContentPage,
});

type Skill = "lesen" | "hoeren" | "sprachbausteine";
interface Row { id: string; title: string; order: number | null; hasNotice: boolean }

const SKILLS: { key: Skill; label: string; teils: number[] }[] = [
  { key: "lesen", label: "Lesen", teils: [1, 2, 3] },
  { key: "hoeren", label: "Hören", teils: [1, 2, 3] },
  { key: "sprachbausteine", label: "Sprachbausteine", teils: [1, 2] },
];
const LEVELS = [
  { value: "TELC_B1", label: "B1" },
  { value: "TELC_B2", label: "B2" },
];

function AdminContentPage() {
  const [skill, setSkill] = useState<Skill>("lesen");
  const [level, setLevel] = useState("TELC_B2");
  const [teil, setTeil] = useState(2);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyingNotice, setApplyingNotice] = useState<"add" | "remove" | null>(null);

  const currentSkill = SKILLS.find((s) => s.key === skill)!;

  const load = useCallback(async () => {
    setLoading(true);
    setDirty(false);
    setEditingId(null);
    setSelected(new Set());
    try {
      const res = await listAdminExercises({ data: { skill, level, teil } });
      setRows(res.rows as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load exercises.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [skill, level, teil]);

  useEffect(() => { load(); }, [load]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(rows.map((r) => r.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function applyNoticeToSelected(flag: boolean) {
    if (selected.size === 0) return;
    setApplyingNotice(flag ? "add" : "remove");
    try {
      const ids = Array.from(selected);
      const res = await bulkSetNotice({ data: { skill, ids, flag } });
      setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, hasNotice: flag } : r)));
      setSelected(new Set());
      toast.success(
        flag
          ? `Notice added to ${res.updated} exercise${res.updated !== 1 ? "s" : ""}.`
          : `Notice removed from ${res.updated} exercise${res.updated !== 1 ? "s" : ""}.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update notice.");
    } finally {
      setApplyingNotice(null);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[index], next[j]] = [next[j], next[index]];
    setRows(next);
    setDirty(true);
  }

  async function saveOrder() {
    setSavingOrder(true);
    try {
      await reorderExercises({ data: { skill, orderedIds: rows.map((r) => r.id) } });
      toast.success("New order saved — subscribers see it on their next visit.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save order.");
    } finally {
      setSavingOrder(false);
    }
  }

  function startEdit(r: Row) {
    setEditingId(r.id);
    setEditValue(r.title);
  }

  async function saveTitle(id: string) {
    if (!editValue.trim()) { toast.error("Title cannot be empty."); return; }
    setSavingTitle(true);
    try {
      await updateExerciseTitle({ data: { skill, id, title: editValue } });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, title: editValue.trim() } : r)));
      setEditingId(null);
      toast.success("Title updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save title.");
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>

      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Exercise Titles & Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rename any exercise and set the exact order students see. Changes save immediately to the database — no
          redeploy needed.
        </p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <select value={skill} onChange={(e) => { const s = e.target.value as Skill; setSkill(s); const t = SKILLS.find((x) => x.key === s)!.teils; if (!t.includes(teil)) setTeil(t[0]); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none">
          {SKILLS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none">
          {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select value={teil} onChange={(e) => setTeil(Number(e.target.value))}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none">
          {currentSkill.teils.map((t) => <option key={t} value={t}>Teil {t}</option>)}
        </select>
      </div>

      {dirty && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">You've changed the order but not saved it yet.</p>
          <button onClick={saveOrder} disabled={savingOrder}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">
            {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save order
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{selected.size} selected</p>
            <p className="text-xs text-muted-foreground" dir="rtl" title={NOTICE_TEXT}>{NOTICE_TEXT}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={clearSelection} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Clear
            </button>
            <button onClick={() => applyNoticeToSelected(false)} disabled={applyingNotice !== null}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50">
              {applyingNotice === "remove" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlagOff className="h-3.5 w-3.5" />}
              Remove notice
            </button>
            <button onClick={() => applyNoticeToSelected(true)} disabled={applyingNotice !== null}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50">
              {applyingNotice === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
              Add "new to Tunisia" notice
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center text-sm text-muted-foreground">
          No exercises for {currentSkill.label} · {LEVELS.find((l) => l.value === level)?.label} · Teil {teil}.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <ListOrdered className="h-3.5 w-3.5" /> {rows.length} exercise{rows.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button onClick={selectAll} className="text-primary hover:underline">Select all</button>
              {selected.size > 0 && <button onClick={clearSelection} className="text-muted-foreground hover:underline">Clear</button>}
            </div>
          </div>
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelected(r.id)}
                className="h-4 w-4 shrink-0 cursor-pointer" />
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              <span className="w-6 shrink-0 text-center text-sm font-black tabular-nums text-muted-foreground">{i + 1}</span>
              {r.hasNotice && (
                <span className="shrink-0" title="Flagged: new to Tunisia">
                  <Flag className="h-3.5 w-3.5 text-amber-500" />
                </span>
              )}

              {editingId === r.id ? (
                <>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitle(r.id); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button onClick={() => saveTitle(r.id)} disabled={savingTitle} className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50">
                    {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm font-medium text-foreground">{r.title}</span>
                  <button onClick={() => startEdit(r)} title="Rename" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} title="Move down" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Plus, Trash2, Pin, PinOff, StickyNote,
  Save, Loader2, Search, X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notes")({
  component: NotesPage,
});

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const COLORS = [
  { id: "default", bg: "bg-card", border: "border-border",           dot: "bg-muted-foreground/40" },
  { id: "yellow",  bg: "bg-amber-50 dark:bg-amber-950/20",  border: "border-amber-300/40 dark:border-amber-700/40",   dot: "bg-amber-400" },
  { id: "blue",    bg: "bg-blue-50 dark:bg-blue-950/20",    border: "border-blue-300/40 dark:border-blue-700/40",     dot: "bg-blue-400"  },
  { id: "green",   bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-300/40 dark:border-emerald-700/40", dot: "bg-emerald-400" },
  { id: "red",     bg: "bg-rose-50 dark:bg-rose-950/20",    border: "border-rose-300/40 dark:border-rose-700/40",     dot: "bg-rose-400"  },
];

function colorConfig(id: string) {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes]         = useState<Note[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Note | null>(null);
  const [search, setSearch]       = useState("");
  const [saving, setSaving]       = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("study_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function createNote() {
    if (!user) return;
    const { data, error } = await supabase
      .from("study_notes")
      .insert({ user_id: user.id, title: "New Note", content: "", color: "default" })
      .select()
      .single();
    if (!error && data) {
      const note = data as Note;
      setNotes((prev) => [note, ...prev]);
      setSelected(note);
    }
  }

  function scheduleAutoSave(updated: Note) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await supabase
        .from("study_notes")
        .update({ title: updated.title, content: updated.content, color: updated.color, updated_at: new Date().toISOString() })
        .eq("id", updated.id);
      setSaving(false);
    }, 800);
  }

  function updateSelected(fields: Partial<Note>) {
    if (!selected) return;
    const updated = { ...selected, ...fields };
    setSelected(updated);
    setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
    scheduleAutoSave(updated);
  }

  async function togglePin(note: Note, e: React.MouseEvent) {
    e.stopPropagation();
    const { error } = await supabase
      .from("study_notes")
      .update({ pinned: !note.pinned })
      .eq("id", note.id);
    if (!error) {
      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, pinned: !n.pinned } : n));
      if (selected?.id === note.id) setSelected((s) => s ? { ...s, pinned: !s.pinned } : s);
    }
  }

  async function deleteNote(note: Note, e: React.MouseEvent) {
    e.stopPropagation();
    const { error } = await supabase.from("study_notes").delete().eq("id", note.id);
    if (!error) {
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      if (selected?.id === note.id) setSelected(null);
      toast.success("Note deleted.");
    }
  }

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const pinned   = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl pb-8">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Study Notes</h1>
          <p className="text-sm text-muted-foreground">{notes.length} notes saved</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full rounded-xl border border-input bg-background py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={createNote}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Note list */}
        <div className="space-y-4 lg:col-span-1">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
              <StickyNote className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">No notes yet</p>
              <p className="text-xs text-muted-foreground">Click "New" to create your first study note.</p>
            </div>
          )}

          {pinned.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pinned</p>
              <div className="space-y-2">
                {pinned.map((note) => <NoteCard key={note.id} note={note} isSelected={selected?.id === note.id} onClick={() => setSelected(note)} onPin={togglePin} onDelete={deleteNote} />)}
              </div>
            </div>
          )}

          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <p className="mb-2 mt-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>}
              <div className="space-y-2">
                {unpinned.map((note) => <NoteCard key={note.id} note={note} isSelected={selected?.id === note.id} onClick={() => setSelected(note)} onPin={togglePin} onDelete={deleteNote} />)}
              </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className={`rounded-2xl border p-6 shadow-sm ${colorConfig(selected.color).bg} ${colorConfig(selected.color).border}`}>
              {/* Toolbar */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => updateSelected({ color: c.id })}
                      className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${c.dot} ${selected.color === c.id ? "border-foreground scale-110" : "border-transparent"}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {saving && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
                  {!saving && <><Save className="h-3 w-3" /> Auto-saved</>}
                </div>
              </div>

              <input
                value={selected.title}
                onChange={(e) => updateSelected({ title: e.target.value })}
                placeholder="Note title…"
                className="mb-3 w-full bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              <textarea
                value={selected.content}
                onChange={(e) => updateSelected({ content: e.target.value })}
                placeholder="Start writing…"
                rows={16}
                className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
                <span>Last updated {new Date(selected.updated_at).toLocaleString()}</span>
                <span>{selected.content.trim().split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center">
              <StickyNote className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a note to edit, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteCard({
  note, isSelected, onClick, onPin, onDelete,
}: {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  onPin: (n: Note, e: React.MouseEvent) => void;
  onDelete: (n: Note, e: React.MouseEvent) => void;
}) {
  const cfg = colorConfig(note.color);
  return (
    <button
      onClick={onClick}
      className={`group relative w-full rounded-xl border p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${cfg.bg} ${cfg.border} ${isSelected ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-snug truncate">{note.title || "Untitled"}</p>
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => onPin(note, e)} className="rounded-md p-0.5 hover:bg-muted/60" title="Pin">
            {note.pinned ? <PinOff className="h-3 w-3 text-muted-foreground" /> : <Pin className="h-3 w-3 text-muted-foreground" />}
          </button>
          <button onClick={(e) => onDelete(note, e)} className="rounded-md p-0.5 hover:bg-destructive/10 hover:text-destructive" title="Delete">
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      {note.content && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{note.content}</p>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">
        {new Date(note.updated_at).toLocaleDateString()}
      </p>
    </button>
  );
}

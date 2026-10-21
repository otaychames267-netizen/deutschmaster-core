import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, RefreshCw, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* Own words for each new theme (migration 20261021160000). The note becomes the second line of the theme's
 * notification; saving also rewrites the notifications that were already sent for it. */

interface Theme {
  source: string;
  item_id: string;
  title: string;
  teil: number | null;
  level: string;
  created_at: string;
  note: string | null;
  visible: boolean;
  announced: boolean;
}

const SOURCE_LABEL: Record<string, string> = { hoeren: "Hören", lesen: "Lesen", sb: "Sprachbausteine", muendlich: "Mündlich" };
const NOTE_MAX = 300;
const keyOf = (t: Theme) => `${t.source}:${t.item_id}`;

export function ThemeNotes() {
  const [themes, setThemes] = useState<Theme[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [announcing, setAnnouncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc("admin_recent_themes", { p_limit: 30 });
    if (error) { toast.error(error.message); return; }
    const rows = (data ?? []) as Theme[];
    setThemes(rows);
    setDrafts(Object.fromEntries(rows.map((t) => [keyOf(t), t.note ?? ""])));
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(t: Theme) {
    const k = keyOf(t);
    setSaving(k);
    try {
      const { data, error } = await (supabase as any).rpc("admin_set_theme_note", {
        p_source: t.source, p_item_id: t.item_id, p_note: drafts[k] ?? "",
      });
      if (error) throw error;
      toast.success(
        (data as number) > 0
          ? `Gespeichert — ${data} bereits gesendete Benachrichtigungen aktualisiert.`
          : t.announced ? "Gespeichert." : "Gespeichert — wird mit der Benachrichtigung gesendet.",
      );
      setThemes((prev) => prev?.map((x) => (keyOf(x) === k ? { ...x, note: (drafts[k] ?? "").trim() || null } : x)) ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(null);
    }
  }

  async function announce(t: Theme) {
    const ok = window.confirm(
      `„${t.title}“ jetzt allen ${t.level.replace("TELC_", "")}-Lernenden als eigene Benachrichtigung melden?

Eine schon gesendete Meldung dieses Themas wird ersetzt und wieder als ungelesen angezeigt.`,
    );
    if (!ok) return;
    const k = keyOf(t);
    setAnnouncing(k);
    try {
      const { data, error } = await (supabase as any).rpc("admin_announce_theme", { p_source: t.source, p_item_id: t.item_id });
      if (error) throw error;
      toast.success(`Gemeldet an ${data} Lernende.`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Melden fehlgeschlagen.");
    } finally {
      setAnnouncing(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-foreground">Text zu jedem neuen Thema</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ein, zwei Sätze zu einem Thema (Was ist neu? Was hat sich geändert?). Er erscheint unter dem Namen in der
            Benachrichtigung. Am besten <strong>vor</strong> dem Sichtbarmachen eintragen — dann geht er gleich mit raus.
            Spätere Änderungen aktualisieren auch schon gesendete Benachrichtigungen.
          </p>
        </div>
        <button
          type="button" onClick={load} title="Neu laden"
          className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {themes === null ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {themes.map((t) => {
            const k = keyOf(t);
            const draft = drafts[k] ?? "";
            const dirty = draft.trim() !== (t.note ?? "");
            return (
              <div key={k} className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p dir="auto" className="text-sm font-semibold text-foreground">{t.title}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {SOURCE_LABEL[t.source] ?? t.source}{t.teil ? ` · Teil ${t.teil}` : ""} · {t.level.replace("TELC_", "")}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    t.announced ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : t.visible ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"}`}>
                    {t.announced ? "gemeldet" : t.visible ? "sichtbar, noch nicht gemeldet" : "versteckt"}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("de-DE")}</span>
                </div>
                <textarea
                  dir="auto" rows={2} maxLength={NOTE_MAX} value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [k]: e.target.value }))}
                  placeholder="Eigener Text für die Benachrichtigung (optional)"
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{draft.length} / {NOTE_MAX}</span>
                  <div className="flex items-center gap-2">
                  <button
                    type="button" onClick={() => announce(t)} disabled={!t.visible || announcing === k}
                    title={t.visible ? "Dieses Thema jetzt als eigene Benachrichtigung senden" : "Nur sichtbare Themen können gemeldet werden"}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    {announcing === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
                    {t.announced ? "Erneut melden" : "Melden"}
                  </button>
                  <button
                    type="button" onClick={() => save(t)} disabled={!dirty || saving === k}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  >
                    {saving === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Speichern
                  </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

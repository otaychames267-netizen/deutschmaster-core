import { useEffect, useState } from "react";
import { Bell, Loader2, Send, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ThemeNotes } from "@/components/admin/ThemeNotes";

/* Admin controls for in-app notifications (migration 20261020120000).
 * Both RPCs re-check is_admin_or_owner() in the database, so this panel only
 * ever *offers* the actions; it cannot grant them. */

interface Group { source: string; teil: number; level: string; new_items: number; recipients: number; url: string; mode?: "single" | "group"; titles?: string[] | null; without_note?: string[] | null }
interface RunResult { dry_run?: boolean; groups?: Group[]; rows_written?: number; skipped?: string }

const SOURCE_LABEL: Record<string, string> = {
  hoeren: "Hören", lesen: "Lesen", sb: "Sprachbausteine", muendlich: "Mündlich",
};

const TITLE_MAX = 120;
const BODY_MAX = 400;

export function NotificationPanel() {
  /* ── automatic content notifications ── */
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<RunResult | null>(null);

  async function runContent(dry: boolean) {
    dry ? setChecking(true) : setSending(true);
    try {
      const { data, error } = await (supabase as any).rpc("admin_notify_run", { p_dry_run: dry });
      if (error) throw error;
      const res = data as RunResult;
      if (dry) setPreview(res);
      else {
        setPreview(null);
        toast.success(`Gesendet: ${res.rows_written ?? 0} Benachrichtigungen.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setChecking(false);
      setSending(false);
    }
  }

  /* ── free-text broadcast ── */
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState<"ALL" | "TELC_B1" | "TELC_B2" | "ME">("ALL");
  const [stats, setStats] = useState<{ devices: number; students: number } | null>(null);
  useEffect(() => {
    (supabase as any).rpc("admin_push_stats").then(({ data }: { data: { devices: number; students: number } | null }) => setStats(data ?? null));
  }, []);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const urlOk = url === "" || (url.startsWith("/") && !url.startsWith("//"));
  const valid = title.trim().length > 0 && title.length <= TITLE_MAX && body.trim().length > 0 && body.length <= BODY_MAX && urlOk;

  async function broadcast(dry: boolean) {
    if (!valid) return;
    if (!dry) {
      const ok = window.confirm(
        `Diese Benachrichtigung an ${count ?? "alle"} Lernende (${audience === "ALL" ? "B1 + B2" : audience === "TELC_B1" ? "B1" : audience === "ME" ? "nur du" : "B2"}) senden?\n\nSie kann nicht zurückgenommen werden.`,
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("admin_broadcast_notification", {
        p_title: title.trim(), p_body: body.trim(), p_url: url.trim() || null, p_level: audience, p_dry_run: dry,
      });
      if (error) throw error;
      if (dry) setCount(data as number);
      else {
        toast.success(`Gesendet an ${data} Lernende.`);
        setTitle(""); setBody(""); setUrl(""); setCount(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const groups = preview?.groups ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground">In-App Benachrichtigungen</h2>
          <p className="text-xs text-muted-foreground">
            Die Glocke oben rechts — erscheint bei allen Lernenden des jeweiligen Levels.
            {stats && <> Handy-Benachrichtigungen aktiv: <strong className="text-foreground tabular-nums">{stats.students}</strong> Lernende ({stats.devices} Geräte).</>}
          </p>
        </div>
      </div>

      {/* Automatic */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <p className="font-bold text-foreground">Neue Inhalte</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Alle 30 Minuten prüft das System automatisch, ob für Lernende sichtbare Übungen oder Themen dazugekommen sind
            (Hören, Lesen, Sprachbausteine, Mündlich). Bis zu 6 neue Themen pro Teil und Level werden{" "}
            <strong>einzeln mit ihrem Namen</strong> gemeldet; bei einem großen Import (mehr als 6) gibt es eine gemeinsame
            Nachricht pro Teil. Versteckte Übungen und Übungen mit dem Tunesien-Hinweis lösen nichts aus.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button" onClick={() => runContent(true)} disabled={checking || sending}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Jetzt prüfen (nichts wird gesendet)
          </button>
          {preview && groups.length > 0 && (
            <button
              type="button" onClick={() => runContent(false)} disabled={sending}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Jetzt senden
            </button>
          )}
        </div>
        {preview && (
          groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              {preview.skipped ?? "Nichts Neues — alle sichtbaren Inhalte sind bereits gemeldet."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Bereich</th><th className="px-3 py-2 text-left">Level</th><th className="px-3 py-2 text-right">Neu</th><th className="px-3 py-2 text-right">Empfänger</th></tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={`${g.source}-${g.teil}-${g.level}`} className="border-t border-border">
                      <td className="px-3 py-2">
                        {SOURCE_LABEL[g.source] ?? g.source} · Teil {g.teil}
                        <span className="ml-2 text-xs text-muted-foreground">{g.mode === "single" ? "einzeln" : "gemeinsam"}</span>
                        {g.titles && g.titles.length > 0 && (
                          <ul className="mt-0.5 list-disc pl-4 text-xs text-muted-foreground">
                            {g.titles.map((t) => (
                              <li key={t}>{t}{g.without_note?.includes(t) && <span className="ml-1 text-amber-600 dark:text-amber-400">— ohne Text</span>}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-2">{g.level.replace("TELC_", "")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{g.new_items}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{g.recipients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <ThemeNotes />

      {/* Free text */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <p className="font-bold text-foreground">Eigene Benachrichtigung senden</p>
          <p className="mt-1 text-sm text-muted-foreground">Für Dinge, die das System nicht von selbst erkennt (z. B. ein Hinweis zur Prüfung).</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Titel</label>
            <span className={`text-xs ${title.length > TITLE_MAX ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>{title.length} / {TITLE_MAX}</span>
          </div>
          <input
            dir="auto" value={title} onChange={(e) => { setTitle(e.target.value); setCount(null); }}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Text</label>
            <span className={`text-xs ${body.length > BODY_MAX ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>{body.length} / {BODY_MAX}</span>
          </div>
          <textarea
            dir="auto" rows={3} value={body} onChange={(e) => { setBody(e.target.value); setCount(null); }}
            className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Link (optional, nur innerhalb der App)</label>
            <input
              value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/b2/schriftlich/vorbereitung/hoeren/teil-2"
              className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 ${urlOk ? "border-input focus:border-primary" : "border-rose-500"}`}
            />
            {!urlOk && <p className="text-xs text-rose-500">Der Link muss mit einem einzelnen / beginnen.</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Empfänger</label>
            <select
              value={audience} onChange={(e) => { setAudience(e.target.value as typeof audience); setCount(null); }}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="ALL">Alle (B1 + B2)</option>
              <option value="TELC_B2">Nur B2</option>
              <option value="TELC_B1">Nur B1</option>
              <option value="ME">Nur ich (Test)</option>
            </select>
          </div>
        </div>

        {valid && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vorschau</p>
            <p dir="auto" className="text-xs font-semibold text-foreground">{title}</p>
            <p dir="auto" className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button" onClick={() => broadcast(true)} disabled={!valid || busy}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            Empfänger zählen
          </button>
          {count !== null && <span className="text-sm text-muted-foreground"><strong className="text-foreground tabular-nums">{count}</strong> Lernende</span>}
          <button
            type="button" onClick={() => broadcast(false)} disabled={!valid || busy || count === null}
            className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            title={count === null ? "Erst „Empfänger zählen“" : undefined}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Eye, EyeOff, Clock, CheckCircle2, XCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  publishDashboardAnnouncement,
  adminListDashboardAnnouncements,
  type DashboardAnnouncement,
} from "@/lib/announcements/announcements.functions";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: AdminAnnouncementsPage,
});

const MAX_LENGTH = 500;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function AdminAnnouncementsPage() {
  const [history, setHistory] = useState<DashboardAnnouncement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const rows = await adminListDashboardAnnouncements();
      setHistory(rows);
    } catch {
      toast.error("Failed to load announcement history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  async function handlePublish() {
    const trimmed = message.trim();
    if (!trimmed) { toast.error("Message cannot be empty."); return; }
    if (trimmed.length > MAX_LENGTH) { toast.error(`Message must be ${MAX_LENGTH} characters or fewer.`); return; }
    setPublishing(true);
    try {
      await publishDashboardAnnouncement({ data: { message: trimmed } });
      toast.success("Announcement published — visible to active subscribers for 24 hours.");
      setMessage("");
      setShowPreview(false);
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish announcement.");
    } finally {
      setPublishing(false);
    }
  }

  const now = Date.now();
  const activeCount = history.filter((a) => new Date(a.expires_at).getTime() > now).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <Megaphone className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Mitteilungen</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Wird 24 Stunden lang allen aktiven Abonnenten auf dem Dashboard angezeigt.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Aktuell aktiv</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Gesamt veröffentlicht</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Megaphone className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{history.length}</p>
        </div>
      </div>

      {/* Compose */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
        <p className="font-bold text-foreground">📢 Neue Mitteilung erstellen</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Nachricht</label>
            <span className={`text-xs ${message.length > MAX_LENGTH ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
              {message.length} / {MAX_LENGTH}
            </span>
          </div>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Was möchten Sie den Lernenden mitteilen?"
            className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            disabled={!message.trim()}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? "Vorschau ausblenden" : "Vorschau anzeigen"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !message.trim() || message.length > MAX_LENGTH}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Veröffentlichen
          </button>
        </div>

        {showPreview && message.trim() && (
          <div className="pt-2">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vorschau (Dashboard-Ansicht)</p>
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Megaphone className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-foreground">Neue Mitteilung</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                  {message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verlauf</p>
        {loadingHistory && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loadingHistory && history.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Noch keine Mitteilungen veröffentlicht.
          </div>
        )}
        {!loadingHistory && history.map((ann) => {
          const isActive = new Date(ann.expires_at).getTime() > now;
          return (
            <div key={ann.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-emerald-500/10" : "bg-muted"}`}>
                {isActive ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground whitespace-pre-line break-words">{ann.message}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {isActive ? "Aktiv" : "Abgelaufen"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Veröffentlicht: {formatDateTime(ann.published_at)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Läuft ab: {formatDateTime(ann.expires_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

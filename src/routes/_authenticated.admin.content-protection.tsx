import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, ShieldOff, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import {
  listContentSuspensions,
  clearContentSuspensionAction,
  permanentlyBanForScraping,
  type ContentSuspensionRow,
} from "@/lib/content-protection/admin-actions.functions";

export const Route = createFileRoute("/_authenticated/admin/content-protection")({
  component: AdminContentProtectionPage,
});

function tierBadge(tier: number) {
  const map: Record<number, { label: string; cls: string }> = {
    0: { label: "None",   cls: "bg-muted text-muted-foreground" },
    1: { label: "Tier 1", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    2: { label: "Tier 2", cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    3: { label: "Tier 3", cls: "bg-destructive/10 text-destructive" },
  };
  const cfg = map[tier] ?? map[0];
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

function AdminContentProtectionPage() {
  const [rows, setRows] = useState<ContentSuspensionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [banReason, setBanReason] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    listContentSuspensions()
      .then(setRows)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function clear(userId: string) {
    setActingOn(userId);
    try {
      await clearContentSuspensionAction({ data: { userId } });
      toast.success("Suspension cleared.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear suspension");
    } finally {
      setActingOn(null);
    }
  }

  async function permanentBan(userId: string) {
    const reason = (banReason[userId] ?? "").trim();
    if (!reason) { toast.error("A reason is required."); return; }
    setActingOn(userId);
    try {
      await permanentlyBanForScraping({ data: { userId, reason } });
      toast.success("Account permanently banned from content access.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to ban account");
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <ShieldAlert className="h-5 w-5 text-amber-500" /> Content Protection
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automated anti-scraping incident ladder. Escalation is always temporary — a permanent ban requires an
            explicit action here, it never happens automatically.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border py-16 text-center">
          <ShieldCheck className="h-8 w-8 text-emerald-500" />
          <p className="text-sm text-muted-foreground">No accounts have an active or historical content-protection consequence.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.userId} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{r.email ?? r.userId}</p>
                  <p className="text-xs text-muted-foreground">{r.incidentCount} incidents (24h window) · updated {new Date(r.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {tierBadge(r.tier)}
                  {r.accountLocked && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      <ShieldOff className="h-3 w-3" /> Locked
                    </span>
                  )}
                  {r.pendingPermanentReview && (
                    <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                      Pending admin review
                    </span>
                  )}
                </div>
              </div>

              {r.suspendedUntil && (
                <p className="mt-2 text-xs text-muted-foreground">Temporary lock expires: {new Date(r.suspendedUntil).toLocaleString()}</p>
              )}
              {r.lockedReason && <p className="mt-1 text-xs text-muted-foreground">Reason: {r.lockedReason}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => clear(r.userId)}
                  disabled={actingOn === r.userId}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Clear suspension
                </button>

                {r.pendingPermanentReview && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Reason for permanent ban…"
                      value={banReason[r.userId] ?? ""}
                      onChange={(e) => setBanReason((b) => ({ ...b, [r.userId]: e.target.value }))}
                      className="w-64 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => permanentBan(r.userId)}
                      disabled={actingOn === r.userId}
                      className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                      Permanently ban (revoke access)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

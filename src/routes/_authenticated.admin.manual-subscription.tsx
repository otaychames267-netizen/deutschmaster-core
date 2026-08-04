import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search, Loader2, BadgeCheck, Clock, Ban, PlusCircle,
  History, ShieldAlert, Mail, Fingerprint,
} from "lucide-react";
import {
  searchUsersForManualSubscription,
  getManualSubscriptionHistory,
  applyManualSubscriptionAction,
  DURATION_LABELS,
  type ManualSubSearchResult,
  type ManualSubActionLogRow,
  type ManualPlanCode,
  type ManualDurationKey,
  type ManualPaymentMethod,
} from "@/lib/admin/manual-subscription.functions";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/manual-subscription")({
  component: ManualSubscriptionPage,
});

const PLAN_LABELS: Record<ManualPlanCode, string> = {
  schriftlich: "Schriftlich",
  muendlich: "Mündlich",
  komplett: "Komplett (everything)",
};

const DURATION_ORDER: ManualDurationKey[] = ["trial_3d", "1m", "3m", "6m", "12m"];

const PAYMENT_METHOD_LABELS: Record<ManualPaymentMethod, string> = {
  virement: "Virement (bank transfer)",
  cash: "Cash",
  d17: "D17 (manual)",
  other: "Other",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isCurrentlyActive(sub: ManualSubSearchResult["subscription"]): boolean {
  return !!sub && sub.status === "active" && new Date(sub.expires_at).getTime() > Date.now();
}

function StatusPill({ sub }: { sub: ManualSubSearchResult["subscription"] }) {
  if (!sub) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        No subscription
      </span>
    );
  }
  const active = isCurrentlyActive(sub);
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
      active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
    }`}>
      {active ? <BadgeCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {active ? "Active" : sub.status === "active" ? "Expired" : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
      {" · "}{PLAN_LABELS[sub.plan_code as ManualPlanCode] ?? sub.plan_code}
      {sub.is_trial ? " · trial" : ""}
    </span>
  );
}

type PendingAction =
  | { kind: "grant"; label: string; newExpiresAt: string }
  | { kind: "extend"; label: string; newExpiresAt: string }
  | { kind: "remove"; label: string };

function ManualSubscriptionPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ManualSubSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ManualSubSearchResult | null>(null);
  const [history, setHistory] = useState<ManualSubActionLogRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [planCode, setPlanCode] = useState<ManualPlanCode>("schriftlich");
  const [duration, setDuration] = useState<ManualDurationKey | "custom">("1m");
  const [customDate, setCustomDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ManualPaymentMethod | "">("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchUsersForManualSubscription({ data: { query: q } });
        setResults(rows);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Search failed.");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function loadHistory(userId: string) {
    try {
      const rows = await getManualSubscriptionHistory({ data: { user_id: userId } });
      setHistory(rows);
    } catch {
      setHistory([]);
    }
  }

  function selectUser(u: ManualSubSearchResult) {
    setSelected(u);
    setResults([]);
    setQuery("");
    setPaymentMethod("");
    setReference("");
    setNotes("");
    setDuration("1m");
    setCustomDate("");
    setHistoryOpen(false);
    loadHistory(u.id);
  }

  async function refreshSelected(userId: string) {
    const rows = await searchUsersForManualSubscription({ data: { query: userId } });
    const fresh = rows.find((r) => r.id === userId);
    if (fresh) setSelected(fresh);
    loadHistory(userId);
  }

  const computedNewExpiry = useMemo(() => {
    if (duration === "custom") {
      if (!customDate) return null;
      const d = new Date(`${customDate}T23:59:59.000Z`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return new Date(Date.now() + { trial_3d: 3, "1m": 30, "3m": 90, "6m": 180, "12m": 365 }[duration] * 86_400_000);
  }, [duration, customDate]);

  const computedExtendExpiry = useMemo(() => {
    if (duration === "custom" || !selected) return null;
    const days = { trial_3d: 3, "1m": 30, "3m": 90, "6m": 180, "12m": 365 }[duration];
    const base = selected.subscription && new Date(selected.subscription.expires_at).getTime() > Date.now()
      ? new Date(selected.subscription.expires_at)
      : new Date();
    return new Date(base.getTime() + days * 86_400_000);
  }, [duration, selected]);

  function requestGrant() {
    if (!selected) return;
    if (duration === "custom" && !computedNewExpiry) { toast.error("Pick a valid custom date."); return; }
    if (!computedNewExpiry) return;
    const label = duration === "custom" ? "Custom date" : DURATION_LABELS[duration];
    setPending({ kind: "grant", label, newExpiresAt: computedNewExpiry.toISOString() });
  }
  function requestExtend() {
    if (!selected || duration === "custom" || !computedExtendExpiry) return;
    setPending({ kind: "extend", label: DURATION_LABELS[duration], newExpiresAt: computedExtendExpiry.toISOString() });
  }
  function requestRemove() {
    if (!selected) return;
    setPending({ kind: "remove", label: "Remove" });
  }

  async function confirmPending() {
    if (!pending || !selected) return;
    setSubmitting(true);
    try {
      if (pending.kind === "remove") {
        await applyManualSubscriptionAction({
          data: { user_id: selected.id, action: "remove", payment_method: paymentMethod || undefined, reference: reference || undefined, notes: notes || undefined },
        });
        toast.success(`Subscription removed for ${selected.full_name ?? selected.email ?? selected.id}.`);
      } else if (pending.kind === "grant") {
        await applyManualSubscriptionAction({
          data: {
            user_id: selected.id, action: "grant", plan_code: planCode,
            duration_key: duration === "custom" ? undefined : duration,
            custom_expires_at: duration === "custom" ? customDate : undefined,
            payment_method: paymentMethod || undefined, reference: reference || undefined, notes: notes || undefined,
          },
        });
        toast.success(`Premium activated for ${selected.full_name ?? selected.email ?? selected.id}.`);
      } else {
        await applyManualSubscriptionAction({
          data: {
            user_id: selected.id, action: "extend", plan_code: planCode, duration_key: duration as ManualDurationKey,
            payment_method: paymentMethod || undefined, reference: reference || undefined, notes: notes || undefined,
          },
        });
        toast.success(`Subscription extended for ${selected.full_name ?? selected.email ?? selected.id}.`);
      }
      await refreshSelected(selected.id);
      setPending(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasSubscription = !!selected?.subscription;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Manual Subscription</h1>
        <p className="text-sm text-muted-foreground">
          Activate Premium for users who paid outside the platform (bank transfer, cash, or manually confirmed D17).
          Every action here is logged and uses the same subscription system as regular paid accounts.
        </p>
      </div>

      {/* Search */}
      {!selected && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            <input
              autoFocus
              type="text"
              placeholder="Search by email, name, or user ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {results.length > 0 && (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(u.full_name?.[0] ?? u.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.full_name ?? <span className="italic text-muted-foreground">No name</span>}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email ?? u.id}</p>
                  </div>
                  <StatusPill sub={u.subscription} />
                </button>
              ))}
            </div>
          )}

          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No users found.</p>
          )}
        </div>
      )}

      {/* Selected user panel */}
      {selected && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {(selected.full_name?.[0] ?? selected.email?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{selected.full_name ?? <span className="italic text-muted-foreground">No name</span>}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {selected.email ?? "—"}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Fingerprint className="h-3 w-3" /> {selected.id}</p>
                <div className="pt-1"><StatusPill sub={selected.subscription} /></div>
                {selected.subscription && (
                  <p className="text-xs text-muted-foreground">Expires: {fmtDate(selected.subscription.expires_at)}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setSelected(null); setPending(null); }}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Change user
            </button>
          </div>

          {/* Action form */}
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Plan</label>
              <select
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value as ManualPlanCode)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                {(Object.keys(PLAN_LABELS) as ManualPlanCode[]).map((p) => (
                  <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDuration(k)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      duration === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {DURATION_LABELS[k]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDuration("custom")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    duration === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Custom date
                </button>
              </div>
              {duration === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="mt-1 w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {duration === "custom"
                  ? computedNewExpiry ? `Expires on ${fmtDate(computedNewExpiry.toISOString())}` : "Pick a date above."
                  : `Grant → expires ${fmtDate(computedNewExpiry?.toISOString())}. Extend → new expiry ${fmtDate(computedExtendExpiry?.toISOString())} (adds to current expiry if still active).`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payment method <span className="font-normal text-muted-foreground">(optional)</span></label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as ManualPaymentMethod | "")}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">—</option>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as ManualPaymentMethod[]).map((p) => (
                    <option key={p} value={p}>{PAYMENT_METHOD_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Reference number <span className="font-normal text-muted-foreground">(optional)</span></label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. transfer ID"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Internal note <span className="font-normal text-muted-foreground">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Not visible to the user — for your own records."
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 border-t border-border pt-4">
              <button
                onClick={requestGrant}
                disabled={duration === "custom" && !computedNewExpiry}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
              >
                <PlusCircle className="h-4 w-4" /> Grant / Set Expiration
              </button>
              <button
                onClick={requestExtend}
                disabled={duration === "custom"}
                title={duration === "custom" ? "Extend uses a duration, not a custom date — use Grant instead." : "Add this duration on top of the current expiration"}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted disabled:opacity-40"
              >
                <Clock className="h-4 w-4" /> Extend Subscription
              </button>
              <button
                onClick={requestRemove}
                disabled={!hasSubscription}
                className="ml-auto flex items-center gap-1.5 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-semibold text-destructive transition-all hover:bg-destructive/10 disabled:opacity-40"
              >
                <Ban className="h-4 w-4" /> Remove Subscription
              </button>
            </div>
          </div>

          {/* History */}
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <History className="h-4 w-4 text-muted-foreground" /> Manual action history ({history.length})
              </span>
              <span className="text-xs text-muted-foreground">{historyOpen ? "Hide" : "Show"}</span>
            </button>
            {historyOpen && (
              <div className="border-t border-border">
                {history.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">No manual actions recorded for this user yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {history.map((h) => (
                      <div key={h.id} className="px-5 py-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{h.action_label}</span>
                          <span className="text-muted-foreground">{fmtDate(h.created_at)}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {h.previous_expires_at ? fmtDate(h.previous_expires_at) : "—"} → {h.new_expires_at ? fmtDate(h.new_expires_at) : "—"}
                          {h.plan_code ? ` · ${PLAN_LABELS[h.plan_code as ManualPlanCode] ?? h.plan_code}` : ""}
                          {h.payment_method ? ` · ${PAYMENT_METHOD_LABELS[h.payment_method as ManualPaymentMethod] ?? h.payment_method}` : ""}
                          {h.reference ? ` · ref: ${h.reference}` : ""}
                        </p>
                        {h.notes && <p className="mt-1 italic text-muted-foreground">“{h.notes}”</p>}
                        <p className="mt-1 text-muted-foreground/70">by {h.admin_email ?? "unknown admin"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              {pending?.kind === "remove" ? "Remove subscription?" : "Are you sure you want to activate Premium for this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selected && pending?.kind === "grant" && (
                <>Grant <strong>{PLAN_LABELS[planCode]}</strong> ({pending.label}) to <strong>{selected.full_name ?? selected.email ?? selected.id}</strong> — new expiration: <strong>{fmtDate(pending.newExpiresAt)}</strong>.</>
              )}
              {selected && pending?.kind === "extend" && (
                <>Extend <strong>{selected.full_name ?? selected.email ?? selected.id}</strong>'s <strong>{PLAN_LABELS[planCode]}</strong> subscription by <strong>{pending.label}</strong> — new expiration: <strong>{fmtDate(pending.newExpiresAt)}</strong>.</>
              )}
              {selected && pending?.kind === "remove" && (
                <>This immediately revokes Premium access for <strong>{selected.full_name ?? selected.email ?? selected.id}</strong>. This can be reversed by granting a new subscription later.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <button
              onClick={confirmPending}
              disabled={submitting}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 ${
                pending?.kind === "remove"
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending?.kind === "remove" ? "Remove" : "Confirm"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

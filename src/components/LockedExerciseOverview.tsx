import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Crown, Check, Sparkles, X, ArrowRight } from "lucide-react";
import type { CatalogItem } from "@/lib/useContentAccess";
import { NoticeGroupBanner } from "@/components/NoticeGroupBanner";
import { orderWithNoticeGroup } from "@/lib/notice-group";

/**
 * The "visible but locked" preview shown to non-subscribers. It renders ONLY
 * the exercise titles (from the titles-only catalog RPC) — there is no
 * protected content in this component's data at all — each with a lock icon.
 * Clicking any locked title, or the CTA, opens a polished subscription dialog
 * that routes to /billing. A non-subscriber can never open, solve, or fetch
 * an exercise from here; the underlying content stays RLS-gated server-side.
 */
export function LockedExerciseOverview({
  heading,
  subheading,
  items,
}: {
  heading: string;
  subheading?: string;
  items: CatalogItem[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const titleOf = (t: string, i: number) => (t && t.trim() ? t : `Übung ${i + 1}`);
  const { ordered, flaggedStartIndex } = orderWithNoticeGroup(items);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">{heading}</h1>
        {subheading && <p className="mt-0.5 text-sm text-muted-foreground">{subheading}</p>}
      </div>

      {/* Premium banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/25">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-black text-foreground">Premium content</p>
              <p className="text-sm text-muted-foreground">
                {items.length > 0 ? `${items.length} exercise${items.length !== 1 ? "s" : ""} available.` : "Exercises available."} Subscribe to unlock all of them.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber-500/25 transition-all hover:shadow-md"
          >
            <Sparkles className="h-4 w-4" /> Unlock — 30 TND/month
          </button>
        </div>
      </div>

      {/* Locked title list */}
      <div className="space-y-2">
        {ordered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center text-sm text-muted-foreground">
            No exercises here yet.
          </div>
        ) : (
          <>
            {ordered.slice(0, flaggedStartIndex).map((ex, i) => (
              <button
                key={ex.id}
                onClick={() => setDialogOpen(true)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-all hover:border-amber-500/40 hover:shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-black tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-medium text-foreground/80">{titleOf(ex.title, i)}</span>
                <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-amber-400">
                  Subscribe <ArrowRight className="h-3 w-3" />
                </span>
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              </button>
            ))}
            {flaggedStartIndex < ordered.length && (
              <>
                <NoticeGroupBanner />
                {ordered.slice(flaggedStartIndex).map((ex, i) => (
                  <button
                    key={ex.id}
                    onClick={() => setDialogOpen(true)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-all hover:border-amber-500/40 hover:shadow-sm"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-black tabular-nums text-amber-600 dark:text-amber-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-medium text-foreground/80">{titleOf(ex.title, flaggedStartIndex + i)}</span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-amber-400">
                      Subscribe <ArrowRight className="h-3 w-3" />
                    </span>
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {dialogOpen && <SubscribeDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function SubscribeDialog({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const benefits = [
    "Lesen, Hören, Sprachbausteine & Schreiben",
    "Full exam simulations (Prüfungssimulation)",
    "AI writing feedback & progress analytics",
    "New content added regularly",
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-6 text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25 backdrop-blur-sm">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black">Unlock your exam prep</p>
              <p className="text-sm text-white/80">Schriftlich — everything written</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-foreground">30</span>
            <span className="text-sm font-semibold text-muted-foreground">TND / month</span>
          </div>
          <ul className="space-y-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-foreground">{b}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => nav({ to: "/billing" })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
          >
            Subscribe now <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-center text-xs text-muted-foreground">Cancel anytime · Instant access after payment is verified</p>
        </div>
      </div>
    </div>
  );
}

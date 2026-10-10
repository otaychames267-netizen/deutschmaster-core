import { useState } from "react";
import { Lock, Crown, Sparkles, ArrowRight } from "lucide-react";
import type { CatalogItem } from "@/lib/useContentAccess";
import { NoticeGroupBanner } from "@/components/NoticeGroupBanner";
import { orderWithNoticeGroup } from "@/lib/notice-group";
import { PaywallModal } from "@/components/PaywallModal";
import { parseVariant } from "@/lib/exercise-variant";
import { VariantBadge, NewBadge } from "@/components/VariantBadges";

/**
 * The "visible but locked" preview shown to non-subscribers. It renders ONLY
 * the exercise titles (from the titles-only catalog RPC) — there is no
 * protected content in this component's data at all — each with a lock icon.
 * Clicking any locked title, or the CTA, opens the shared PaywallModal.
 * A non-subscriber can never open, solve, or fetch an exercise from here;
 * the underlying content stays RLS-gated server-side.
 *
 * `compact` renders just the row list + a small inline CTA banner, no big
 * heading/premium hero — used when this is appended below real, interactive
 * free-sample exercises rather than shown as a standalone locked page.
 *
 * `restrictedOnly` covers a different case: the viewer already has full plan
 * access, but one or more specific items are withheld from their account
 * (e.g. a per-user NEU-content restriction) — RLS still returns the row's
 * title via the catalog RPC so it stays visible with a lock icon, but there
 * is nothing to "subscribe" to here, so the paywall CTA/dialog is suppressed
 * in favor of a neutral "restricted" label.
 */
export function LockedExerciseOverview({
  heading,
  subheading,
  items,
  compact = false,
  restrictedOnly = false,
}: {
  heading: string;
  subheading?: string;
  items: CatalogItem[];
  compact?: boolean;
  restrictedOnly?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const titleOf = (t: string, i: number) => (t && t.trim() ? t : `Übung ${i + 1}`);
  // Conversion strategy: a non-subscriber's locked preview leads with the
  // NEU/Original/Modified items — the freshest, most eye-catching content —
  // to entice a subscription, rather than plain alphabetical/import order.
  // Stable sort keeps everything else in its original relative order.
  const prioritized = restrictedOnly
    ? items
    : [...items].sort((a, b) => {
        const av = parseVariant(a.title);
        const bv = parseVariant(b.title);
        const aScore = av.isNew || av.variant ? 0 : 1;
        const bScore = bv.isNew || bv.variant ? 0 : 1;
        return aScore - bScore;
      });
  const { ordered, flaggedStartIndex, hiddenCount } = orderWithNoticeGroup(prioritized);
  const openPaywall = () => { if (!restrictedOnly) setDialogOpen(true); };

  return (
    <div className={compact ? "space-y-3" : "mx-auto max-w-3xl space-y-6 pb-10"}>
      {/* Header */}
      {!compact && (
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{heading}</h1>
          {subheading && <p className="mt-0.5 text-sm text-muted-foreground">{subheading}</p>}
        </div>
      )}

      {/* Premium banner */}
      {restrictedOnly ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} restricted on this account
          </p>
        </div>
      ) : compact ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {items.length} more exercise{items.length !== 1 ? "s" : ""} — subscribe to unlock
          </p>
          <button
            onClick={openPaywall}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
          >
            <Sparkles className="h-3.5 w-3.5" /> Unlock
          </button>
        </div>
      ) : (
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
      )}

      {/* Locked title list */}
      <div className="space-y-2">
        {ordered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center text-sm text-muted-foreground">
            No exercises here yet.
          </div>
        ) : (
          <>
            {ordered.slice(0, flaggedStartIndex).map((ex, i) => {
              const v = parseVariant(titleOf(ex.title, i));
              return (
                <button
                  key={ex.id}
                  onClick={openPaywall}
                  className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card to-card px-4 py-3.5 text-left shadow-sm transition-all ${restrictedOnly ? "cursor-default opacity-80" : "hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10"}`}
                >
                  {!restrictedOnly && <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 opacity-0 transition-opacity group-hover:opacity-100" />}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-black tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold text-foreground/85">{v.baseTitle}</span>
                      {v.variant && <VariantBadge variant={v.variant} />}
                    </div>
                  </div>
                  {v.isNew && <NewBadge />}
                  {restrictedOnly ? (
                    <span className="hidden shrink-0 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground sm:block">
                      Restricted
                    </span>
                  ) : (
                    <span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm sm:flex">
                      Subscribe <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                  <Lock className={`h-4 w-4 shrink-0 ${restrictedOnly ? "text-muted-foreground/60" : "text-amber-500/60"}`} />
                </button>
              );
            })}
            {flaggedStartIndex < ordered.length && (
              <>
                <NoticeGroupBanner />
                {ordered.slice(flaggedStartIndex).map((ex, i) => {
                  const v = parseVariant(titleOf(ex.title, flaggedStartIndex + i));
                  return (
                    <button
                      key={ex.id}
                      onClick={openPaywall}
                      className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card to-card px-4 py-3.5 text-left shadow-sm transition-all ${restrictedOnly ? "cursor-default opacity-80" : "hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10"}`}
                    >
                      {!restrictedOnly && <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 opacity-0 transition-opacity group-hover:opacity-100" />}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-black tabular-nums text-amber-600 dark:text-amber-400">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-semibold text-foreground/85">{v.baseTitle}</span>
                          {v.variant && <VariantBadge variant={v.variant} />}
                        </div>
                      </div>
                      {v.isNew && <NewBadge />}
                      {restrictedOnly ? (
                        <span className="hidden shrink-0 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground sm:block">
                          Restricted
                        </span>
                      ) : (
                        <span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm sm:flex">
                          Subscribe <ArrowRight className="h-3 w-3" />
                        </span>
                      )}
                      <Lock className={`h-4 w-4 shrink-0 ${restrictedOnly ? "text-muted-foreground/60" : "text-amber-500/60"}`} />
                    </button>
                  );
                })}
              </>
            )}
            {hiddenCount > 0 && <NoticeGroupBanner hiddenCount={hiddenCount} />}
          </>
        )}
      </div>

      <PaywallModal open={dialogOpen} onClose={() => setDialogOpen(false)} reason="locked" />
    </div>
  );
}

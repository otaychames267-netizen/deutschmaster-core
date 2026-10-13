import { BadgePercent, CalendarDays, CalendarRange, RefreshCcwDot, Sparkles, Timer } from "lucide-react";
import { availableMonths, maxPackSaving, offerDaysLeft, perMonth, savedAmount, savedPercent, type Months, type PricingMap, type TermPrice } from "@/lib/plans/pricing";

/**
 * Price presentation for the plan cards (landing page + billing), drawn for the navy/gold `.plan-premium` card ground. Everything shown is derived from the
 * prices the server charges (lib/plans/pricing.ts): the struck-through price only appears when the server says it is a genuine reduction, and the offer
 * countdown only while the offer really runs (after it ends the charge itself goes back to the regular price).
 */

/** Segmented "1 month | 2 months | 3 months" switch with the biggest pack saving as a gold badge. Lives on the page background, above the cards. */
export function TermToggle({ months, onChange, pricing }: { months: Months; onChange: (m: Months) => void; pricing: PricingMap }) {
  const saving = maxPackSaving(pricing);
  const all: { m: Months; label: string; labelAr: string; Icon: typeof CalendarDays }[] = [
    { m: 1, label: "1 month", labelAr: "شهر", Icon: CalendarDays },
    { m: 2, label: "2 months", labelAr: "شهران", Icon: CalendarRange },
    { m: 3, label: "3 months", labelAr: "3 أشهر", Icon: CalendarRange },
  ];
  const offered = availableMonths(pricing);
  const options = all.filter((o) => offered.includes(o.m));
  return (
    <div className={`mx-auto w-full ${options.length > 2 ? "max-w-lg" : "max-w-xs"}`}>
      <div role="radiogroup" aria-label="Subscription length" className={`relative grid gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm ${options.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map(({ m, label, labelAr, Icon }) => {
          const on = months === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(m)}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-sm font-bold transition-all sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
                on ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{label}</span>
              <span dir="rtl" lang="ar" className={`text-xs font-semibold ${on ? "text-primary-foreground/75" : "text-muted-foreground/80"}`}>{labelAr}</span>
            </button>
          );
        })}
        {saving > 0 && (
          <span className="pointer-events-none absolute -right-2 -top-3 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-black text-gold-foreground shadow-md">
            <BadgePercent className="h-3 w-3" aria-hidden /> Save up to {saving} TND
          </span>
        )}
      </div>
      <p className="mt-2.5 text-center text-xs text-muted-foreground">
        {months > 1 ? (
          <>One payment, {months} months of access — the better deal. <span dir="rtl" lang="ar" className="font-medium text-foreground/80">دفعة واحدة و{months === 2 ? "شهران" : "3 أشهر"} بسعر أقل.</span></>
        ) : (
          <>Prefer to pay month by month? <span className="font-medium text-foreground/80">Longer packs cost less per month.</span></>
        )}
      </p>
    </div>
  );
}

/** Big price, struck-through regular price, percent badge, per-month note and ONE offer strip (launch offer countdown and/or the saving). */
export function PriceBlock({ term, offerEndsAt }: { term: TermPrice; offerEndsAt: string | null }) {
  const pct = savedPercent(term);
  const save = savedAmount(term);
  const days = offerDaysLeft(offerEndsAt);
  const urgent = days !== null && days <= 7;
  const when = days === null ? "" : days === 0 ? "ends today" : days === 1 ? "ends tomorrow" : `ends in ${days} days`;
  const whenAr = days === null ? "" : days === 0 ? "ينتهي اليوم" : days === 1 ? "ينتهي غداً" : `ينتهي بعد ${days} يوماً`;
  const StripIcon = days !== null ? Timer : Sparkles;
  return (
    <div>
      <div className="flex items-end gap-3">
        <span className="text-[56px] font-extrabold leading-[0.85] tracking-tight tabular-nums text-white">{term.price}</span>
        <div className="pb-0.5 leading-none">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">TND</p>
          {term.listPrice && term.listPrice > term.price && (
            <s className="mt-1 block text-[15px] font-semibold tabular-nums text-white/45 decoration-gold/80 decoration-2">
              {term.listPrice}
              <span className="sr-only"> TND regular price</span>
            </s>
          )}
        </div>
        {pct > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 self-start rounded-full bg-gold px-2.5 py-1 text-[11px] font-black text-gold-foreground shadow-sm">
            <BadgePercent className="h-3 w-3" aria-hidden /> −{pct}%
          </span>
        )}
      </div>
      <p className="mt-2.5 text-xs text-white/65">
        {term.months === 1 ? "per month" : <>for {term.months} months · <b className="text-white/90">{perMonth(term)} TND</b> / month</>}
      </p>
      {(days !== null || save > 0) && (
        <div className={`mt-4 rounded-xl px-3.5 py-2.5 ring-1 ring-inset ${urgent ? "bg-amber-400/15 ring-amber-300/35" : "bg-white/[0.06] ring-white/10"}`}>
          <div className="flex items-center justify-between gap-3 text-[12px] font-semibold">
            <span className="inline-flex items-center gap-1.5 text-white/90">
              <StripIcon className={`h-3.5 w-3.5 shrink-0 ${urgent ? "text-amber-300" : "text-gold"}`} aria-hidden />
              {days !== null ? `Launch offer · ${when}` : "Pack price"}
            </span>
            {save > 0 && <span className="shrink-0 text-gold">Save {save} TND</span>}
          </div>
          <p dir="rtl" lang="ar" className="mt-1 text-[11.5px] leading-snug text-white/60">
            {days !== null ? `عرض الإطلاق · ${whenAr}` : "سعر الباقة"}
            {save > 0 ? ` · وفّر ${save} دينار` : ""}
          </p>
        </div>
      )}
      {days === null && save <= 0 && (
        <div className="mt-4 rounded-xl bg-white/[0.06] px-3.5 py-2.5 ring-1 ring-inset ring-white/10">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/90">
            <RefreshCcwDot className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden /> No auto-renewal — you pay only when you want more
          </p>
          <p dir="rtl" lang="ar" className="mt-1 text-[11.5px] leading-snug text-white/60">لا تجديد تلقائي — تدفع فقط عندما تريد المتابعة</p>
        </div>
      )}
    </div>
  );
}

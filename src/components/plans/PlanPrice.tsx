import { BadgePercent, CalendarDays, CalendarRange, Flame, Sparkles, Timer } from "lucide-react";
import { maxPackSaving, offerDaysLeft, perMonth, savedAmount, savedPercent, type Months, type PricingMap, type TermPrice } from "@/lib/plans/pricing";

/**
 * Price presentation for the plan cards (landing page + billing), drawn for the navy/gold `.plan-premium` card ground. Everything shown is derived from the
 * prices the server charges (lib/plans/pricing.ts): the struck-through price only appears when the server says it is a genuine reduction, and the offer
 * countdown only while the offer really runs (after it ends the charge itself goes back to the regular price).
 */

/** Segmented "1 month | 2 months" switch with the saving of the 2-month pack as a gold badge. Lives on the page background, above the cards. */
export function TermToggle({ months, onChange, pricing }: { months: Months; onChange: (m: Months) => void; pricing: PricingMap }) {
  const saving = maxPackSaving(pricing);
  const options: { m: Months; label: string; labelAr: string; Icon: typeof CalendarDays }[] = [
    { m: 1, label: "1 month", labelAr: "شهر", Icon: CalendarDays },
    { m: 2, label: "2 months", labelAr: "شهران", Icon: CalendarRange },
  ];
  return (
    <div className="mx-auto w-full max-w-xs">
      <div role="radiogroup" aria-label="Subscription length" className="relative grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {options.map(({ m, label, labelAr, Icon }) => {
          const on = months === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(m)}
              className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
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
        {months === 2 ? (
          <>One payment, two months of access — the better deal. <span dir="rtl" lang="ar" className="font-medium text-foreground/80">دفعة واحدة وشهران بسعر أقل.</span></>
        ) : (
          <>Prefer to pay month by month? <span className="font-medium text-foreground/80">Two months cost less per month.</span></>
        )}
      </p>
    </div>
  );
}

/** The days-left chip of a running launch offer. */
export function OfferChip({ endsAt }: { endsAt: string | null }) {
  const days = offerDaysLeft(endsAt);
  if (days === null) return null;
  const urgent = days <= 7;
  const when = days === 0 ? "ends today" : days === 1 ? "ends tomorrow" : `ends in ${days} days`;
  const whenAr = days === 0 ? "ينتهي اليوم" : days === 1 ? "ينتهي غداً" : `ينتهي بعد ${days} يوماً`;
  const Icon = urgent ? Flame : Timer;
  return (
    <p
      className={`mt-2.5 inline-flex flex-wrap items-center gap-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
        urgent ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/40" : "bg-white/10 text-white/90"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>Launch offer · {when}</span>
      <span dir="rtl" lang="ar" className="font-semibold opacity-85">عرض الإطلاق · {whenAr}</span>
    </p>
  );
}

/** Big price, struck-through regular price, percent badge, per-month note, "you save" chip and the offer countdown. */
export function PriceBlock({ term, offerEndsAt }: { term: TermPrice; offerEndsAt: string | null }) {
  const pct = savedPercent(term);
  const save = savedAmount(term);
  return (
    <div>
      <div className="flex items-end gap-2">
        <span className="text-5xl font-black leading-none tracking-tight tabular-nums text-white">{term.price}</span>
        <span className="pb-1 text-sm font-semibold text-white/60">TND</span>
        {term.listPrice && term.listPrice > term.price && (
          <s className="pb-1 text-lg font-semibold tabular-nums text-white/45 decoration-gold/80 decoration-2">
            {term.listPrice}
            <span className="sr-only"> TND regular price</span>
          </s>
        )}
        {pct > 0 && (
          <span className="mb-1 ml-auto inline-flex items-center gap-1 self-start rounded-full bg-gold px-2.5 py-1 text-[11px] font-black text-gold-foreground shadow-sm">
            <BadgePercent className="h-3 w-3" aria-hidden /> −{pct}%
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-white/70">
        {term.months === 1 ? "per month" : <>for 2 months · <b className="text-white/90">{perMonth(term)} TND</b> / month</>}
      </p>
      {save > 0 && (
        <p className="mt-2.5 inline-flex flex-wrap items-center gap-x-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-gold">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>You save {save} TND</span>
          <span dir="rtl" lang="ar" className="font-semibold opacity-90">وفّرت {save} دينار</span>
        </p>
      )}
      <div><OfferChip endsAt={offerEndsAt} /></div>
    </div>
  );
}

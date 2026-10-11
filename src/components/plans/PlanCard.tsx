import type { LucideIcon } from "lucide-react";

/**
 * The shared pieces of a plan card (landing + billing), drawn for the navy/gold (Gold) or cool-metal (Platinum) `.plan-premium` ground. The accent colour
 * is the card's own `--color-gold` (re-pointed to platinum by `.tier-platinum`), so nothing here branches on the tier except the emblem ring.
 */
export type Tier = "gold" | "platinum";

/** Emblem + tier name + one-line positioning. */
export function PlanHeader({ name, tag, tagline, icon: Icon }: { tier?: Tier; name: string; tag?: string | null; tagline: string; icon: LucideIcon }) {
  return (
    <header>
      <div className="flex items-center gap-3.5">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/35 via-gold/10 to-transparent text-gold ring-1 ring-inset ring-gold/45 shadow-[0_0_24px_-6px_var(--color-gold)]">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold uppercase leading-none tracking-[0.22em] text-gold">{name}</p>
          {tag && <p className="mt-1.5 truncate text-[11.5px] font-medium text-white/60">{tag}</p>}
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-white/75 md:min-h-[2.75rem]">{tagline}</p>
    </header>
  );
}

/** A hairline that fades out at both ends — separates the price/CTA zone from the feature list. */
export function PlanDivider() {
  return <div aria-hidden className="my-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />;
}

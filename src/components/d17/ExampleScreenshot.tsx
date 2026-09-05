import { CheckCircle2, Smartphone } from "lucide-react";

/**
 * Real screenshots from an actual, completed D17 transfer to this
 * platform's own official number — provided directly by the platform owner
 * specifically to use as the canonical "what a valid screenshot looks like"
 * examples (public/examples/payment/). Unlike an illustrative mockup, this
 * shows students the real La Poste Tunisienne D17 app UI they'll actually
 * see, which is clearer and more trustworthy than an abstraction. Safe to
 * publish: the destination number is already the platform's own public
 * payment number shown elsewhere on this same page, and the authorization
 * number in it can't be reused to defraud anyone — reusing this exact image
 * as a submission is caught by the pipeline's own duplicate-image detection.
 */

interface ExampleImageProps {
  src: string;
  alt: string;
  caption: string;
}

function ExampleImage({ src, alt, caption }: ExampleImageProps) {
  return (
    <figure className="mx-auto w-full max-w-[220px]">
      <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
        <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" />
      </div>
      <figcaption className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {caption}
      </figcaption>
    </figure>
  );
}

/** Real example for Screenshot 1 — the payment-success confirmation screen. */
export function ExampleSuccessScreenshot() {
  return (
    <ExampleImage
      src="/examples/payment/d17-example-1-success.jpg"
      alt="Real D17 payment success confirmation screenshot, showing the amount, destination number, and Authorization Number"
      caption="Correct payment screenshot — Example 1"
    />
  );
}

/** Real example for Screenshot 2 — the D17 transaction history / journal entry. */
export function ExampleHistoryScreenshot() {
  return (
    <ExampleImage
      src="/examples/payment/d17-example-2-journal.jpg"
      alt="Real D17 Journal transaction history entry screenshot, showing the amount, destination number, and Authorization Number"
      caption="Correct payment screenshot — Example 2"
    />
  );
}

interface UploadGuidanceProps {
  example: React.ReactNode;
  title: string;
  explanation: string;
  mistakes: string[];
}

/** Full guidance block: example diagram + short explanation + common mistakes,
 * shared layout for both required screenshots so the two fields feel
 * consistent rather than bespoke. */
export function UploadGuidance({ example, title, explanation, mistakes }: UploadGuidanceProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-[220px_1fr]">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          <Smartphone className="h-3 w-3" /> Example — {title}
        </p>
        {example}
      </div>
      <div className="space-y-2.5">
        <p className="text-xs leading-relaxed text-muted-foreground">{explanation}</p>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Common mistakes to avoid</p>
          <ul className="mt-1 space-y-1">
            {mistakes.map((m) => (
              <li key={m} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500/60" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

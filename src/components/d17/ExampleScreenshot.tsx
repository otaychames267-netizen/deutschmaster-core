import { CheckCircle2, Smartphone } from "lucide-react";

/**
 * Illustrative, schematic example of what each required screenshot should
 * show — deliberately NOT a photorealistic copy of the real D17 app (we
 * don't have rights to reproduce their UI, and a fake-looking "real"
 * screenshot could itself be mistaken for an actual payment record). This is
 * a generic phone-mockup diagram with labeled callouts pointing at the
 * fields that matter, captioned as an example everywhere it's used.
 */

interface FieldRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function FieldRow({ label, value, highlight }: FieldRowProps) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${highlight ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-mono font-semibold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[220px] rounded-[1.5rem] border-4 border-foreground/15 bg-background p-1.5 shadow-sm">
      <div className="flex items-center justify-center gap-1 py-1">
        <div className="h-1 w-8 rounded-full bg-foreground/15" />
      </div>
      <div className="rounded-xl bg-card px-3 py-3">{children}</div>
    </div>
  );
}

/** Example layout for Screenshot 1 — the payment-success confirmation screen. */
export function ExampleSuccessScreenshot() {
  return (
    <PhoneFrame>
      <div className="flex flex-col items-center gap-1.5 pb-2 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
        <p className="text-[11px] font-bold text-foreground">Payment Successful</p>
      </div>
      <div className="space-y-1 border-t border-border pt-2">
        <FieldRow label="Amount" value="30.000 TND" highlight />
        <FieldRow label="To" value="XX XXX XXX" highlight />
        <FieldRow label="Date" value="Today, 14:32" />
        <FieldRow label="Auth. Number" value="482193" highlight />
      </div>
    </PhoneFrame>
  );
}

/** Example layout for Screenshot 2 — the D17 transaction history / journal entry. */
export function ExampleHistoryScreenshot() {
  return (
    <PhoneFrame>
      <p className="mb-2 text-[11px] font-bold text-foreground">Transaction History</p>
      <div className="space-y-1.5">
        <div className="rounded-lg bg-muted/50 px-2.5 py-2 ring-1 ring-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground">Transfer sent</span>
            <span className="text-[10px] font-mono font-semibold text-primary">-30.000 TND</span>
          </div>
          <div className="mt-1 space-y-0.5">
            <FieldRow label="To" value="XX XXX XXX" />
            <FieldRow label="Date & time" value="Today, 14:32" />
            <FieldRow label="Auth. Number" value="482193" highlight />
          </div>
        </div>
        <div className="rounded-lg px-2.5 py-2 opacity-30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground">Earlier transfer</span>
            <span className="text-[10px] font-mono text-muted-foreground">-15.000 TND</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
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

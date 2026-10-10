import { Check } from "lucide-react";

interface PaymentStepperProps {
  /** 1-indexed current step. */
  current: 1 | 2 | 3;
}

const STEPS = ["Send payment", "Confirm & upload", "Review"];

export function PaymentStepper({ current }: PaymentStepperProps) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {step < STEPS.length && (
              <div className={`mx-2 mb-4 h-px flex-1 ${done ? "bg-emerald-500" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

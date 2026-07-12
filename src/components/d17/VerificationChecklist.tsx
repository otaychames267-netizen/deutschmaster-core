import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

const STEPS = [
  "Screenshot uploaded",
  "Parsing screenshot (OCR)",
  "Detecting payment",
  "Verifying amount & currency",
  "Checking transaction reference",
  "Checking for duplicates",
  "Fraud detection",
  "Calculating risk score",
];

interface VerificationChecklistProps {
  /** true the instant the file finishes uploading to storage */
  uploaded: boolean;
  /** true once the server has returned a real result — snaps every
   * remaining step to checked instead of leaving it mid-animation */
  done: boolean;
}

/**
 * The whole pipeline runs as a single synchronous server round trip (no
 * granular server-sent progress events — see verify.functions.ts's header
 * comment on why that's the right call for this app). Step 1 reflects real
 * upload completion; steps 2-8 are staged client-side purely for perceived
 * progress and all resolve together the moment the real response returns.
 */
export function VerificationChecklist({ uploaded, done }: VerificationChecklistProps) {
  const [visibleStep, setVisibleStep] = useState(0);

  useEffect(() => {
    if (!uploaded) {
      setVisibleStep(0);
      return;
    }
    if (done) {
      setVisibleStep(STEPS.length);
      return;
    }
    setVisibleStep(1);
    const interval = setInterval(() => {
      setVisibleStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 550);
    return () => clearInterval(interval);
  }, [uploaded, done]);

  return (
    <div className="space-y-2.5">
      {STEPS.map((label, i) => {
        const isChecked = done ? true : i < visibleStep;
        const isActive = !done && i === visibleStep && uploaded;
        return (
          <div key={label} className="flex items-center gap-3">
            {isChecked ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            ) : isActive ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground/30" />
            )}
            <span
              className={`text-sm ${
                isChecked ? "font-medium text-foreground" : isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

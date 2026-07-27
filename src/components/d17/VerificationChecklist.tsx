import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Circle, XCircle, ShieldAlert } from "lucide-react";

const STEPS = [
  "Screenshot uploaded",
  "Parsing screenshot (OCR)",
  "Detecting payment & recipient",
  "Verifying amount & currency",
  "Checking transaction reference",
  "Checking for duplicates",
  "Fraud detection",
  "Calculating risk score",
];

export type D17Decision = "auto_approved" | "manual_review" | "auto_rejected_duplicate" | "auto_rejected_fraud";

export interface VerificationOutcome {
  decision: D17Decision;
  reason: string;
  /** Machine-readable hard-gate reason from the rule engine, when the
   * decision was a hard rejection — used to pick which step to mark failed.
   * Null for approved/manual_review, or if the pipeline never reached the
   * rule engine at all (e.g. an identifier-reservation conflict). */
  hardGate: string | null;
}

/** Maps a rule-engine hard-gate reason to the STEPS index it corresponds to,
 * so a rejection halts the checklist at a step that's honestly related to
 * what actually failed, instead of a generic catch-all. */
function stepIndexForHardGate(hardGate: string | null): number {
  switch (hardGate) {
    case "screenshot_type":
    case "wrong_recipient":
      return 2; // Detecting payment & recipient
    case "amount_mismatch":
    case "currency_mismatch":
      return 3; // Verifying amount & currency
    case "authorization_number_mismatch":
      return 4; // Checking transaction reference
    case "fraud":
      return 6; // Fraud detection
    default:
      return 5; // Checking for duplicates — covers auto_rejected_duplicate and any unmapped reason
  }
}

interface VerificationChecklistProps {
  /** true the instant the file finishes uploading to storage */
  uploaded: boolean;
  /** null while the server call is in flight; set once a real result returns */
  outcome: VerificationOutcome | null;
}

/**
 * The whole pipeline runs as a single synchronous server round trip (no
 * granular server-sent progress events — see verify.functions.ts's header
 * comment on why that's the right call for this app). Step 1 reflects real
 * upload completion; steps 2-8 are staged client-side purely for perceived
 * progress while the request is in flight.
 *
 * Once `outcome` arrives, the checklist stops pretending: an approval or a
 * manual-review outcome (nothing was confidently wrong — genuine AI
 * uncertainty is not a failure) completes every step green. A hard rejection
 * halts at the step that actually failed — that step turns red, nothing
 * after it is ever marked, and the real rejection reason is shown below. No
 * decision is allowed to render a fully-green checklist except an actual
 * approval.
 */
export function VerificationChecklist({ uploaded, outcome }: VerificationChecklistProps) {
  const [visibleStep, setVisibleStep] = useState(0);

  useEffect(() => {
    if (!uploaded) {
      setVisibleStep(0);
      return;
    }
    if (outcome) return;
    setVisibleStep(1);
    const interval = setInterval(() => {
      setVisibleStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 550);
    return () => clearInterval(interval);
  }, [uploaded, outcome]);

  const isRejected = outcome?.decision === "auto_rejected_duplicate" || outcome?.decision === "auto_rejected_fraud";
  const failedStepIndex = isRejected ? stepIndexForHardGate(outcome!.hardGate) : null;

  return (
    <div className="space-y-2.5">
      {STEPS.map((label, i) => {
        const isFailed = failedStepIndex !== null && i === failedStepIndex;
        const isPastFailure = failedStepIndex !== null && i > failedStepIndex;
        const isChecked = outcome ? (isRejected ? i < failedStepIndex! : true) : i < visibleStep;
        const isActive = !outcome && !isFailed && i === visibleStep && uploaded;

        return (
          <div key={label} className="flex items-center gap-3">
            {isFailed ? (
              <XCircle className="h-5 w-5 shrink-0 text-red-500" />
            ) : isChecked ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            ) : isActive ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground/30" />
            )}
            <span
              className={`text-sm ${
                isFailed
                  ? "font-semibold text-red-600 dark:text-red-400"
                  : isChecked
                    ? "font-medium text-foreground"
                    : isActive
                      ? "text-foreground"
                      : isPastFailure
                        ? "text-muted-foreground/40"
                        : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}

      {outcome && isRejected && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{outcome.reason}</span>
        </div>
      )}
      {outcome?.decision === "manual_review" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{outcome.reason || "Nothing failed — this submission needs a quick human confirmation. Sent to manual review."}</span>
        </div>
      )}
    </div>
  );
}

import { useNavigate } from "@tanstack/react-router";
import { Crown, Check, X, ArrowRight, Sparkles } from "lucide-react";

/**
 * Shared subscription paywall dialog. Two trigger contexts share this same
 * component so copy/visuals never drift between them: clicking a locked
 * (non-sample) exercise, and finishing a free-sample exercise. Never fetches
 * or holds any protected content itself — purely a conversion CTA to /billing.
 */
export function PaywallModal({
  open,
  onClose,
  reason = "locked",
}: {
  open: boolean;
  onClose: () => void;
  reason?: "locked" | "sample-complete";
}) {
  const nav = useNavigate();
  if (!open) return null;

  const benefits = [
    "Lesen, Hören, Sprachbausteine & Schreiben",
    "Full exam simulations (Prüfungssimulation)",
    "AI writing feedback & progress analytics",
    "New content added regularly",
  ];

  const headline = reason === "sample-complete" ? "Nice work! That was a free sample" : "The free launch period has ended";
  const sub = reason === "sample-complete"
    ? "Subscribe to unlock every exercise in every skill."
    : "Thank you for trying AuraLingovia. To continue accessing all Premium exercises, simulations, and learning materials, please subscribe.";

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
              {reason === "sample-complete" ? <Sparkles className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-lg font-black">{headline}</p>
              <p className="text-sm text-white/80">{sub}</p>
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Copy, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/referrals")({
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user } = useAuth();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [referralCount, setReferralCount]     = useState(0);
  const [loading, setLoading]                 = useState(true);

  const referralCode = user?.id
    ? user.id.replace(/-/g, "").substring(0, 8).toUpperCase()
    : null;
  const referralUrl = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`
    : null;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [subRes, refRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .in("status", ["active", "trial"])
          .limit(1),
        supabase
          .from("referrals")
          .select("id", { count: "exact" })
          .eq("referrer_id", user.id)
          .eq("status", "converted"),
      ]);
      setHasSubscription((subRes.data?.length ?? 0) > 0);
      setReferralCount(refRes.count ?? 0);
      setLoading(false);
    })();
  }, [user?.id]);

  function copyUrl() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    toast.success("Referral link copied!");
  }

  const MILESTONES = [
    { count: 1,  reward: "+1 free day",  reached: referralCount >= 1 },
    { count: 5,  reward: "+3 free days", reached: referralCount >= 5 },
    { count: 10, reward: "+7 free days", reached: referralCount >= 10 },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Referral Program</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Earn free days by inviting friends who subscribe.
        </p>
      </div>

      {!loading && !hasSubscription && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            You need an active subscription to participate in the referral program and earn rewards.
          </p>
        </div>
      )}

      {/* Referral link */}
      {hasSubscription && referralUrl && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Your referral link
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralUrl}
              className="flex-1 rounded-lg border border-input bg-muted px-3 py-2 text-xs text-muted-foreground"
            />
            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your code: <strong className="text-foreground font-mono">{referralCode}</strong>
          </p>
        </div>
      )}

      {/* Milestones */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-sm font-medium text-foreground">
          Rewards — {referralCount} successful referral{referralCount !== 1 ? "s" : ""}
        </p>
        <div className="space-y-3">
          {MILESTONES.map((m) => (
            <div
              key={m.count}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                m.reached ? "bg-emerald-500/10" : "bg-muted/50"
              }`}
            >
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${m.reached ? "text-emerald-500" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <span className="text-sm text-foreground">{m.count} referral{m.count > 1 ? "s" : ""}</span>
              </div>
              <span className={`text-sm font-medium ${m.reached ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {m.reward}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Rewards are applied automatically when a referred user completes their first paid subscription. Self-referrals and duplicate accounts are detected and disqualified.
      </p>
    </div>
  );
}

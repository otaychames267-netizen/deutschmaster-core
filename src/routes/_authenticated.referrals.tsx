import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Gift, Copy, AlertCircle, CheckCircle2,
  Users, Share2, Clock, ArrowUpRight,
  Trophy, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/referrals")({
  component: ReferralsPage,
});

interface ReferralRow {
  id: string;
  status: string;
  created_at: string;
  converted_at: string | null;
}

interface RewardRow {
  id: string;
  referral_id: string;
  days_granted: number;
  reason: string;
  applied_at: string | null;
  created_at: string;
}

// Matches process_referral_conversion() in
// 20261015100000_referral_10_days_and_code_entry.sql exactly — each converted
// referral grants +10 total days, linearly, capped at +30 total days (one
// free month), which the 3rd converted friend reaches; nothing is granted
// past the 3rd.
const MILESTONES = [
  { count: 1, reward: "+10 free days (total)", icon: "🎁", xp: 100 },
  { count: 2, reward: "+20 free days (total)", icon: "⭐", xp: 150 },
  { count: 3, reward: "+30 free days (total, one free month — maximum)", icon: "👑", xp: 400 },
];

const APPLY_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Code accepted — your friend will earn free days when you subscribe." },
  invalid: { ok: false, text: "This code does not exist. Check it and try again." },
  own_code: { ok: false, text: "You can't use your own code." },
  already_referred: { ok: false, text: "You already joined with a friend's code." },
  already_subscribed: { ok: false, text: "Codes can only be added before your first subscription." },
  unauthenticated: { ok: false, text: "Please sign in again." },
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function ReferralsPage() {
  const { user } = useAuth();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [referrals, setReferrals]   = useState<ReferralRow[]>([]);
  const [rewards, setRewards]       = useState<RewardRow[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [copied, setCopied]         = useState(false);
  // The code THIS user joined with (null = joined without one, so the entry box is shown).
  const [joinedWithCode, setJoinedWithCode] = useState<string | null>(null);
  const [codeInput, setCodeInput]   = useState("");
  const [applying, setApplying]     = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; text: string } | null>(null);

  // The real, DB-backed code (profiles.referral_code) — what register_referral()
  // actually looks up. Previously this was re-derived client-side from
  // user.id with no server-side link to it at all, so sharing it did
  // nothing: nothing on the registration side ever read a ?ref= param.
  const referralUrl = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`
    : null;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [subRes, refRes, rewardRes, profileRes, joinedRes] = await Promise.all([
        supabase.from("subscriptions").select("id").eq("user_id", user.id).eq("status", "active").gt("expires_at", new Date().toISOString()).limit(1),
        supabase.from("referrals").select("id, status, created_at, converted_at").eq("referrer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("referral_rewards").select("id, referral_id, days_granted, reason, applied_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
        supabase.from("referrals").select("referral_code").eq("referred_id", user.id).maybeSingle(),
      ]);
      setJoinedWithCode((joinedRes.data as { referral_code: string } | null)?.referral_code ?? null);
      setHasSubscription((subRes.data?.length ?? 0) > 0);
      setReferrals((refRes.data as ReferralRow[]) ?? []);
      setRewards((rewardRes.data as RewardRow[]) ?? []);
      setReferralCode((profileRes.data as { referral_code: string | null } | null)?.referral_code ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  async function copyUrl() {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function applyCode() {
    const code = codeInput.trim().toUpperCase();
    if (!code || applying) return;
    setApplying(true); setApplyResult(null);
    try {
      const { data, error } = await (supabase as any).rpc("apply_referral_code", { p_code: code });
      if (error) throw error;
      const res = APPLY_MESSAGES[String(data)] ?? { ok: false, text: "Could not apply the code. Please try again." };
      setApplyResult(res);
      if (data === "ok") { setJoinedWithCode(code); setCodeInput(""); toast.success("Referral code applied!"); }
    } catch {
      setApplyResult({ ok: false, text: "Could not apply the code. Please try again." });
    } finally {
      setApplying(false);
    }
  }

  async function copyCode() {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  }

  const convertedCount = referrals.filter((r) => r.status === "converted").length;
  const pendingCount   = referrals.filter((r) => r.status === "pending").length;
  // Each referral_rewards row records exactly which referral it came from
  // (referral_id), so every converted friend can show the real days THAT
  // specific referral earned — not just the running total — even once the
  // 30-day cap means later friends earn 0 (cap already reached).
  const daysByReferralId = new Map(rewards.map((r) => [r.referral_id, r.days_granted]));

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-8">
        <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72" /></div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Referral Program</h1>
        <p className="text-sm text-muted-foreground">Invite friends and earn free subscription days when they subscribe.</p>
      </div>

      {/* Got a friend's code? — manual entry (the link ?ref=CODE is the other way in) */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <p className="font-semibold text-foreground">Got a friend&apos;s code? <span className="font-normal text-muted-foreground">· عندك رمز دعوة؟</span></p>
        </div>
        {joinedWithCode ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>You joined with the code <code className="font-mono font-bold tracking-widest">{joinedWithCode}</code> — your friend earns free days when you subscribe.</span>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">Enter it before your first subscription. Your friend earns +10 free days when you subscribe.</p>
            <form
              onSubmit={(e) => { e.preventDefault(); void applyCode(); }}
              className="flex items-center gap-2"
            >
              <input
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32)); setApplyResult(null); }}
                placeholder="e.g. 02938AA1"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Referral code"
                className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 font-mono text-sm uppercase tracking-widest text-foreground placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={!codeInput.trim() || applying}
                className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applying ? "Checking…" : "Apply"}
              </button>
            </form>
            {applyResult && (
              <p className={`mt-2 text-xs font-medium ${applyResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`} role="status">{applyResult.text}</p>
            )}
          </>
        )}
      </div>

      {/* Subscription gate */}
      {!hasSubscription && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">Subscription required</p>
            <p className="mt-0.5 text-sm text-muted-foreground">You need an active subscription to join the referral program and earn rewards.</p>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total referred",  value: referrals.length,  icon: Users,    color: "text-blue-500   bg-blue-500/10"   },
          { label: "Converted",       value: convertedCount,     icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Pending",         value: pendingCount,       icon: Clock,    color: "text-amber-500  bg-amber-500/10"  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
            <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${color.split(" ")[1]}`}>
              <Icon className={`h-4.5 w-4.5 ${color.split(" ")[0]}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      {hasSubscription && referralUrl && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <p className="font-semibold text-foreground">Your referral link</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Share this link. When your friend registers and subscribes, you earn a reward.</p>
            <div className="flex items-center gap-2">
              <input readOnly value={referralUrl}
                className="flex-1 rounded-xl border border-input bg-muted px-3 py-2.5 text-xs text-muted-foreground font-mono" />
              <button onClick={copyUrl}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  copied ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}>
                {copied ? <><CheckCircle2 className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Referral code:</span>
            <code className="flex-1 font-mono text-sm font-bold text-foreground tracking-widest">{referralCode}</code>
            <button onClick={copyCode} className="text-xs font-medium text-primary hover:underline">
              Copy code
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (navigator.share) navigator.share({ title: "AuraLingovia", text: "Join me on AuraLingovia — prepare for your TELC exam!", url: referralUrl });
                else copyUrl();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      )}

      {/* Milestone rewards */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <p className="font-semibold text-foreground">Reward milestones</p>
          <span className="ml-auto text-xs text-muted-foreground">{convertedCount} / {MILESTONES[MILESTONES.length-1].count} converted</span>
        </div>

        <div className="space-y-3">
          {MILESTONES.map((m) => {
            const reached = convertedCount >= m.count;
            const pct = Math.min(100, (convertedCount / m.count) * 100);
            return (
              <div key={m.count} className={`rounded-xl border p-4 transition-all ${
                reached ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/10"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{m.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.count} {m.count === 1 ? "referral" : "referrals"}</p>
                      <p className="text-xs text-muted-foreground">{m.reward} · +{m.xp} XP</p>
                    </div>
                  </div>
                  {reached && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                </div>
                {!reached && (
                  <>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">{convertedCount}/{m.count}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reward history */}
      {rewards.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="font-semibold text-foreground">Reward history</p>
          </div>
          <div className="space-y-2">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">+{r.days_granted} free {r.days_granted === 1 ? "day" : "days"}</p>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral history */}
      {referrals.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <p className="font-semibold text-foreground">Referral history</p>
          </div>
          <div className="space-y-2">
            {referrals.map((r, i) => {
              const daysEarned = daysByReferralId.get(r.id);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-muted/20 px-4 py-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    r.status === "converted" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                  }`}>
                    {r.status === "converted" ? "✓" : "…"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">Friend {i + 1} · {r.status === "converted" ? "Subscribed" : "Registered"}</p>
                    {r.converted_at && (
                      <p className="text-xs text-muted-foreground">Converted {new Date(r.converted_at).toLocaleDateString("en-GB")}</p>
                    )}
                  </div>
                  {r.status === "converted" && (
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                      daysEarned ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {daysEarned ? `+${daysEarned} day${daysEarned > 1 ? "s" : ""}` : "cap reached"}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Rewards apply automatically when a referred user completes their first paid subscription.
        Self-referrals and duplicate accounts are disqualified.
      </p>
    </div>
  );
}

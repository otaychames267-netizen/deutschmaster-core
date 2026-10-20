import { useState } from "react";
import { BellRing, BellOff, Smartphone, Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePush, isPushPromptDismissed, dismissPushPrompt } from "@/lib/push";

/** Opt-in for phone alerts. `card` lives on /notifications; `compact` is the one-line offer in the bell dropdown. */
export function PushToggle({ variant }: { variant: "card" | "compact" }) {
  const { user } = useAuth();
  const { status, busy, error, enable, disable } = usePush(user?.id);
  const [dismissed, setDismissed] = useState(() => (variant === "compact" ? isPushPromptDismissed() : false));

  if (status === "checking" || status === "unsupported") return null;

  if (variant === "compact") {
    if (status !== "off" || dismissed) return null;
    return (
      <div className="flex items-center gap-2 border-t border-border bg-primary/5 px-3 py-2">
        <BellRing className="h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-foreground">Get an alert on your phone when new exercises arrive</p>
        <button
          type="button" onClick={enable} disabled={busy}
          className="shrink-0 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
        </button>
        <button
          type="button" aria-label="Not now" onClick={() => { dismissPushPrompt(); setDismissed(true); }}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const on = status === "on";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? "bg-emerald-500/10" : "bg-primary/10"}`}>
          {status === "denied" ? <BellOff className="h-4 w-4 text-muted-foreground" />
            : status === "ios-install" ? <Smartphone className="h-4 w-4 text-primary" />
            : <BellRing className={`h-4 w-4 ${on ? "text-emerald-500" : "text-primary"}`} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {on ? "Phone alerts are on" : status === "denied" ? "Phone alerts are blocked" : "Get alerts on this device"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {status === "ios-install"
              ? "On iPhone, alerts work from the installed app: tap Share → Add to Home Screen, open AuraLingovia from your home screen, then come back here."
              : status === "denied"
                ? "You blocked notifications for this site. Allow them in your browser's site settings, then reload this page."
                : on
                  ? "You will get a message here when new exercises are added. Nothing is sent between 22:00 and 08:00."
                  : "We will send a message when new exercises are added — even when the app is closed. Nothing is sent between 22:00 and 08:00."}
          </p>
          {status !== "denied" && status !== "ios-install" && (
            <p dir="rtl" className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {on ? "باش يوصلك إشعار على تيليفونك كي يتزادو تمارين جداد." : "فعّل الإشعارات باش يوصلك تنبيه على تيليفونك كي يتزادو تمارين جداد، حتى كان التطبيق مسكّر."}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
        {(status === "off" || on) && (
          <button
            type="button" onClick={on ? disable : enable} disabled={busy}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-opacity disabled:opacity-60 ${
              on ? "border border-border bg-card text-muted-foreground hover:text-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {on ? "Turn off" : "Enable"}
          </button>
        )}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings2, Globe, Bell, CreditCard, Shield, Save, CheckCircle2, AlertOctagon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  setD17KillSwitch, setD17DisabledSwitch, setD17ConfigValue, getD17ConfigValues,
  getD17PaymentConfigValues, setD17PaymentConfigValue,
} from "@/lib/d17/platform-settings.functions";
import { getPlanPrices, updatePlanPrice } from "@/lib/admin/plans.functions";
import { toast } from "sonner";

const D17_CONFIG_FIELDS: { key: string; label: string; suffix: string }[] = [
  { key: "d17_auto_approve_threshold", label: "Auto-approve confidence threshold", suffix: "%" },
  { key: "d17_max_attempts_per_order", label: "Max upload attempts per order", suffix: "" },
  { key: "d17_manual_review_window_hours", label: "Manual review window", suffix: "hours" },
  { key: "d17_ten_minute_submission_limit", label: "Burst limit (per 10 minutes)", suffix: "" },
  { key: "d17_hourly_submission_limit", label: "Hourly submission limit", suffix: "" },
  { key: "d17_confirmation_window_minutes", label: "Payment confirmation window", suffix: "minutes" },
  { key: "d17_suspension_tier1_hours", label: "1st duplicate suspension", suffix: "hours" },
  { key: "d17_suspension_tier2_hours", label: "2nd duplicate suspension", suffix: "hours" },
];

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [killSwitch, setKillSwitchState] = useState<boolean | null>(null);
  const [killSwitchBusy, setKillSwitchBusy] = useState(false);
  const [d17Disabled, setD17DisabledState] = useState<boolean | null>(null);
  const [d17DisabledBusy, setD17DisabledBusy] = useState(false);
  const [d17Config, setD17Config] = useState<Record<string, number> | null>(null);
  const [d17ConfigBusyKey, setD17ConfigBusyKey] = useState<string | null>(null);
  const [d17Payment, setD17Payment] = useState<{ number: string | null; iban: string | null; accountHolder: string | null } | null>(null);
  const [d17PaymentBusyField, setD17PaymentBusyField] = useState<string | null>(null);
  const [planPrices, setPlanPrices] = useState<Record<string, number> | null>(null);
  const [planPriceBusyCode, setPlanPriceBusyCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    platformName: "AuraLingovia",
    supportEmail: "support@auralingovia.com",
    maintenanceMode: false,
    registrationOpen: true,
    emailNotifications: true,
    stripeKey: "",
  });

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  useEffect(() => {
    supabase
      .rpc("get_platform_setting", { p_key: "payment_verification_kill_switch" })
      .then(({ data }) => setKillSwitchState(data === true));
    supabase
      .rpc("get_platform_setting", { p_key: "d17_disabled" })
      .then(({ data }) => setD17DisabledState(data === true));
    getD17ConfigValues({ data: undefined }).then((cfg) => setD17Config(cfg)).catch(() => setD17Config(null));
    getD17PaymentConfigValues({ data: undefined }).then((cfg) => setD17Payment(cfg)).catch(() => setD17Payment(null));
    getPlanPrices({ data: undefined }).then((p) => setPlanPrices(p)).catch(() => setPlanPrices(null));
  }, []);

  async function handleD17PaymentChange(field: "number" | "iban" | "accountHolder", value: string) {
    setD17PaymentBusyField(field);
    try {
      await setD17PaymentConfigValue({ data: { field, value } });
      setD17Payment((prev) => (prev ? { ...prev, [field]: value.trim() || null } : prev));
      toast.success("Payment detail updated — only new orders will use it.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this field.");
    } finally {
      setD17PaymentBusyField(null);
    }
  }

  async function handlePlanPriceChange(code: string, value: string) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a positive number.");
      return;
    }
    setPlanPriceBusyCode(code);
    try {
      await updatePlanPrice({ data: { plan_code: code as "schriftlich" | "muendlich" | "komplett", price_tnd: num } });
      setPlanPrices((prev) => (prev ? { ...prev, [code]: num } : prev));
      toast.success("Price updated — existing orders/subscriptions keep their original amount.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the price.");
    } finally {
      setPlanPriceBusyCode(null);
    }
  }

  async function handleD17ConfigChange(key: string, value: string) {
    const numValue = Number(value);
    if (!Number.isFinite(numValue) || numValue <= 0) {
      toast.error("Enter a positive number.");
      return;
    }
    setD17ConfigBusyKey(key);
    try {
      await setD17ConfigValue({ data: { key, value: numValue } });
      setD17Config((prev) => (prev ? { ...prev, [key]: numValue } : prev));
      toast.success("Setting updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the setting.");
    } finally {
      setD17ConfigBusyKey(null);
    }
  }

  async function toggleD17Disabled() {
    if (d17Disabled === null || d17DisabledBusy) return;
    const next = !d17Disabled;
    setD17DisabledBusy(true);
    try {
      await setD17DisabledSwitch({ data: { disabled: next } });
      setD17DisabledState(next);
      toast.success(next ? "D17 manual payment disabled — the button is now hidden on /billing." : "D17 manual payment re-enabled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the D17 switch.");
    } finally {
      setD17DisabledBusy(false);
    }
  }

  async function toggleKillSwitch() {
    if (killSwitch === null || killSwitchBusy) return;
    const next = !killSwitch;
    setKillSwitchBusy(true);
    try {
      await setD17KillSwitch({ data: { enabled: next } });
      setKillSwitchState(next);
      toast.success(next ? "Kill switch enabled — all new D17 payments will go to manual review." : "Kill switch disabled — automated verification resumed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the kill switch.");
    } finally {
      setKillSwitchBusy(false);
    }
  }

  function Field({ label, name, type = "text", disabled = false }: {
    label: string; name: keyof typeof form; type?: string; disabled?: boolean;
  }) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        <input
          type={type}
          value={form[name] as string}
          disabled={disabled}
          onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))}
          className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
      </div>
    );
  }

  function Toggle({ label, name, desc }: { label: string; name: keyof typeof form; desc: string }) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <button
          onClick={() => setForm(prev => ({ ...prev, [name]: !prev[name] }))}
          className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${form[name] ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${form[name] ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    );
  }

  const Section = ({ icon: Icon, color, title, children }: {
    icon: React.ComponentType<{ className?: string }>; color: string; title: string; children: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-black text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Admin Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform-wide configuration and system settings.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      <Section icon={Globe} color="bg-blue-500/10 text-blue-500" title="General">
        <Field label="Platform name" name="platformName" />
        <Field label="Support email" name="supportEmail" type="email" />
        <div className="space-y-3 pt-1">
          <Toggle label="Maintenance mode" name="maintenanceMode" desc="Show a maintenance page to non-admin users." />
          <Toggle label="Open registration" name="registrationOpen" desc="Allow new users to sign up." />
        </div>
      </Section>

      <Section icon={CreditCard} color="bg-violet-500/10 text-violet-500" title="Billing & Plans">
        {planPrices === null ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {(["schriftlich", "muendlich", "komplett"] as const).map((code) => (
              <div key={code} className="space-y-1.5">
                <label className="text-xs font-semibold capitalize text-foreground">{code} price (TND/mo)</label>
                <input
                  type="number"
                  defaultValue={planPrices[code]}
                  key={`${code}-${planPrices[code]}`}
                  disabled={planPriceBusyCode === code}
                  onBlur={(e) => e.target.value !== String(planPrices[code]) && handlePlanPriceChange(code, e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Prices are read live by both Lemon Squeezy checkout and D17 order creation. Changing a price only affects
          orders/checkouts created after the change — every existing order and subscription keeps the amount it was
          created with.
        </p>
        <Field label="Stripe secret key" name="stripeKey" type="password" disabled />
        <p className="text-xs text-muted-foreground">
          Stripe key management is handled server-side via environment variables. Contact your hosting provider to update it.
        </p>
      </Section>

      <Section icon={Bell} color="bg-amber-500/10 text-amber-500" title="Notifications">
        <Toggle label="Email notifications" name="emailNotifications" desc="Send system emails (welcome, renewal reminders, announcements)." />
      </Section>

      <Section icon={AlertOctagon} color="bg-red-500/10 text-red-500" title="D17 Payment Verification">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Emergency kill switch</p>
            <p className="text-xs text-muted-foreground">
              Bypasses AI verification entirely — every new D17 screenshot goes straight to manual review. Use this
              if the Gemini service is down or misbehaving.
            </p>
          </div>
          {killSwitch === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <button
              onClick={toggleKillSwitch}
              disabled={killSwitchBusy}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${killSwitch ? "bg-red-500" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${killSwitch ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          )}
        </div>
        {killSwitch === true && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400">
            Kill switch is ON — all new D17 verification attempts are being routed to manual review.
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Disable D17 manual payment</p>
            <p className="text-xs text-muted-foreground">
              Hides the "Manual Payment (D17 Mobile Transfer)" button on /billing entirely — no new D17 orders can be
              started. Lemon Squeezy card payment is unaffected, and any D17 order already in progress keeps working
              normally. Use this if the D17 destination number/IBAN needs to change or D17 itself is down.
            </p>
          </div>
          {d17Disabled === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <button
              onClick={toggleD17Disabled}
              disabled={d17DisabledBusy}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${d17Disabled ? "bg-red-500" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${d17Disabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          )}
        </div>
        {d17Disabled === true && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400">
            D17 manual payment is disabled — students only see card payment on /billing.
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment destination</p>
          {d17Payment === null ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["number", "D17 phone number"],
                ["iban", "IBAN (optional alternative)"],
                ["accountHolder", "Account holder name"],
              ] as const).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">{label}</label>
                  <input
                    type="text"
                    defaultValue={d17Payment[field] ?? ""}
                    key={`${field}-${d17Payment[field]}`}
                    disabled={d17PaymentBusyField === field}
                    onBlur={(e) => e.target.value !== (d17Payment[field] ?? "") && handleD17PaymentChange(field, e.target.value)}
                    placeholder={field === "iban" ? "Optional" : "Not configured"}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Shown to students on the D17 payment page for every order created from now on. Orders already created
            keep the destination details they were shown at the time — changing this never alters an existing order.
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Dynamic risk configuration</p>
          {d17Config === null ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {D17_CONFIG_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={d17Config[f.key]}
                      key={`${f.key}-${d17Config[f.key]}`}
                      disabled={d17ConfigBusyKey === f.key}
                      onBlur={(e) => e.target.value !== String(d17Config[f.key]) && handleD17ConfigChange(f.key, e.target.value)}
                      className="w-24 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                    />
                    <span className="text-xs text-muted-foreground">{f.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Every change here is permanently logged with the previous value — see `platform_settings_history`.
          </p>
        </div>
      </Section>

      <Section icon={Shield} color="bg-emerald-500/10 text-emerald-500" title="Security">
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            Row-Level Security (RLS) is enforced at the database level by Supabase. These policies cannot be changed here — modify them in your Supabase dashboard under Authentication → Policies.
          </div>
        </div>
      </Section>
    </div>
  );
}

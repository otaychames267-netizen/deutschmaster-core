import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings2, Globe, Bell, CreditCard, Shield, Save, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    platformName: "AuraLingovia",
    supportEmail: "support@auralingovia.com",
    trialDays: "3",
    schriftlichPrice: "25",
    muendlichPrice: "45",
    komplettprice: "60",
    maintenanceMode: false,
    registrationOpen: true,
    emailNotifications: true,
    stripeKey: "",
  });

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Schriftlich price (TND/mo)" name="schriftlichPrice" type="number" />
          <Field label="Mündlich price (TND/mo)" name="muendlichPrice" type="number" />
          <Field label="Komplett price (TND/mo)" name="komplettprice" type="number" />
        </div>
        <Field label="Trial duration (days)" name="trialDays" type="number" />
        <Field label="Stripe secret key" name="stripeKey" type="password" disabled />
        <p className="text-xs text-muted-foreground">
          Stripe key management is handled server-side via environment variables. Contact your hosting provider to update it.
        </p>
      </Section>

      <Section icon={Bell} color="bg-amber-500/10 text-amber-500" title="Notifications">
        <Toggle label="Email notifications" name="emailNotifications" desc="Send system emails (welcome, renewal reminders, announcements)." />
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

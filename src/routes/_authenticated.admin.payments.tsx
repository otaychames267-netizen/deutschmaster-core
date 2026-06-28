import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, TrendingUp, CreditCard, RefreshCw, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <DollarSign className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Payments</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">Transaction history and revenue overview.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Revenue",    value: "—",  icon: DollarSign,  color: "text-amber-500  bg-amber-500/10"  },
          { label: "This Month",       value: "—",  icon: TrendingUp,  color: "text-blue-500   bg-blue-500/10"   },
          { label: "Active Subscriptions", value: "—", icon: CreditCard, color: "text-emerald-500 bg-emerald-500/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color.split(" ")[1]}`}>
                <Icon className={`h-4 w-4 ${color.split(" ")[0]}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-muted-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
          <RefreshCw className="h-6 w-6 text-amber-500" />
        </div>
        <p className="font-black text-foreground">Stripe Integration Required</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Payment history, invoices, and revenue analytics will be available once your Stripe account is connected.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          Configure in Admin → Settings
        </div>
      </div>
    </div>
  );
}

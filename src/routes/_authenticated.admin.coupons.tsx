import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tag, Plus, Copy, Trash2, CheckCircle2, Clock, Percent } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: AdminCouponsPage,
});

interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: "percent" | "days";
  uses: number;
  maxUses: number | null;
  active: boolean;
  expiresAt: string | null;
}

const DEMO: Coupon[] = [
  { id: "1", code: "WELCOME20", discount: 20, type: "percent", uses: 12, maxUses: 100, active: true, expiresAt: "2026-12-31" },
  { id: "2", code: "FREE7DAYS", discount: 7,  type: "days",    uses: 3,  maxUses: 50,  active: true, expiresAt: null },
  { id: "3", code: "LAUNCH50",  discount: 50, type: "percent", uses: 50, maxUses: 50,  active: false, expiresAt: "2026-03-01" },
];

function AdminCouponsPage() {
  const [coupons] = useState<Coupon[]>(DEMO);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <Tag className="h-5 w-5 text-amber-500" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-foreground">Coupons</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">Create and manage discount codes.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> New coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active coupons", value: coupons.filter(c => c.active).length, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Total uses",     value: coupons.reduce((s, c) => s + c.uses, 0), icon: Percent, color: "text-blue-500 bg-blue-500/10" },
          { label: "Expired",        value: coupons.filter(c => !c.active).length, icon: Clock, color: "text-muted-foreground bg-muted" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color.split(" ")[1]}`}>
                <Icon className={`h-4 w-4 ${color.split(" ")[0]}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <p className="font-bold text-foreground mb-4">Create new coupon</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Coupon code", placeholder: "e.g. SUMMER30", type: "text" },
              { label: "Discount amount", placeholder: "e.g. 30", type: "number" },
            ].map((field) => (
              <div key={field.label} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{field.label}</label>
                <input type={field.type} placeholder={field.placeholder}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Discount type</label>
              <select className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors">
                <option value="percent">Percentage (%)</option>
                <option value="days">Free days</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Expires (optional)</label>
              <input type="date"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { toast.info("Coupon creation requires Stripe integration."); setShowForm(false); }}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition-colors">
              Create coupon
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <p className="text-sm font-bold text-foreground">All coupons</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Code", "Discount", "Uses", "Status", "Expires", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3.5">
                    <code className="font-mono text-sm font-bold text-foreground">{c.code}</code>
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-foreground">
                    {c.type === "percent" ? `${c.discount}% off` : `${c.discount} free days`}
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">
                    {c.uses}{c.maxUses ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground text-xs">{c.expiresAt ?? "Never"}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Code copied!"); }}
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

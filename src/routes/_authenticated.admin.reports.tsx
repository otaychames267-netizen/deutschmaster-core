import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Download, TrendingUp, Users, BookOpen, CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReportsPage,
});

const REPORTS = [
  {
    icon: Users,
    title: "User Growth Report",
    desc: "New registrations, active users, churn, and retention metrics by period.",
    color: "text-blue-500 bg-blue-500/10",
    badge: "Monthly",
  },
  {
    icon: CreditCard,
    title: "Revenue Report",
    desc: "Subscription revenue, plan distribution, upgrade/downgrade events.",
    color: "text-amber-500 bg-amber-500/10",
    badge: "Monthly",
  },
  {
    icon: BookOpen,
    title: "Learning Activity Report",
    desc: "Exercise completions, session durations, section popularity, pass rates.",
    color: "text-violet-500 bg-violet-500/10",
    badge: "Weekly",
  },
  {
    icon: TrendingUp,
    title: "Performance Report",
    desc: "Average scores, improvement trends, level distribution by user cohort.",
    color: "text-emerald-500 bg-emerald-500/10",
    badge: "Monthly",
  },
];

function AdminReportsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <ClipboardList className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Reports</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">Download detailed reports about platform performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <div key={r.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.color.split(" ")[1]}`}>
                <r.icon className={`h-5 w-5 ${r.color.split(" ")[0]}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{r.title}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    {r.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
              </div>
            </div>
            <button
              onClick={() => {}}
              disabled
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-2 text-xs font-semibold text-muted-foreground cursor-not-allowed"
              title="Available when Stripe + full analytics are connected"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV — coming soon
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Full report exports will be available once Stripe and the analytics pipeline are connected.
          Reports will be downloadable as CSV and PDF.
        </p>
      </div>
    </div>
  );
}

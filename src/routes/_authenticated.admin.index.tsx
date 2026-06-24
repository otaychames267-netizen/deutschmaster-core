import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, CreditCard, FileText, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminIndexPage,
});

function AdminIndexPage() {
  const [stats, setStats] = useState({
    users: 0,
    subscriptions: 0,
    exams: 0,
    pendingImports: 0,
  });

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trial"]),
      supabase.from("exams").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("pdf_imports").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
    ]).then(([users, subs, exams, imports]) => {
      setStats({
        users: users.count ?? 0,
        subscriptions: subs.count ?? 0,
        exams: exams.count ?? 0,
        pendingImports: imports.count ?? 0,
      });
    });
  }, []);

  const cards = [
    { label: "Total users",          value: stats.users,          icon: Users,    to: "/admin/users",         color: "text-blue-500" },
    { label: "Active subscriptions", value: stats.subscriptions,  icon: CreditCard, to: "/admin/subscriptions", color: "text-emerald-500" },
    { label: "Published exams",      value: stats.exams,          icon: BookOpen,  to: "/admin/exams",          color: "text-violet-500" },
    { label: "Pending PDF reviews",  value: stats.pendingImports, icon: FileText,  to: "/admin/pdf-import",     color: "text-amber-500" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin Overview</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">AuraLingovia platform management.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

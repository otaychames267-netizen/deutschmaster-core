import { createFileRoute } from "@tanstack/react-router";
import { ScrollText, Filter, Search, Clock, User, Shield, Settings, FileText, Database } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({
  component: AdminAuditLogsPage,
});

interface LogEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  ip: string;
  ts: string;
  category: "auth" | "admin" | "content" | "billing";
}

const DEMO_LOGS: LogEntry[] = [
  { id: "1", action: "User signed in",           actor: "alice@example.com", target: "—",                     ip: "85.12.x.x", ts: "2026-06-25 14:32", category: "auth"    },
  { id: "2", action: "PDF uploaded",             actor: "admin@example.com", target: "TELC_B2_Mock_2024.pdf",  ip: "82.11.x.x", ts: "2026-06-25 13:10", category: "content" },
  { id: "3", action: "Subscription activated",   actor: "bob@example.com",   target: "komplett plan",          ip: "91.45.x.x", ts: "2026-06-25 11:55", category: "billing" },
  { id: "4", action: "User role updated",        actor: "owner@example.com", target: "alice@example.com",     ip: "82.11.x.x", ts: "2026-06-24 19:20", category: "admin"   },
  { id: "5", action: "Exam deleted",             actor: "admin@example.com", target: "Lesen Teil 1 — Set A",  ip: "82.11.x.x", ts: "2026-06-24 17:40", category: "content" },
  { id: "6", action: "Settings changed",         actor: "owner@example.com", target: "Max PDF size",          ip: "82.11.x.x", ts: "2026-06-24 15:00", category: "admin"   },
  { id: "7", action: "Password reset requested", actor: "carol@example.com", target: "—",                     ip: "77.23.x.x", ts: "2026-06-23 09:15", category: "auth"    },
];

const CATEGORY_CONFIG = {
  auth:    { icon: Shield,   bg: "bg-blue-500/10",    text: "text-blue-500",    label: "Auth"    },
  admin:   { icon: Settings, bg: "bg-amber-500/10",   text: "text-amber-500",   label: "Admin"   },
  content: { icon: FileText, bg: "bg-violet-500/10",  text: "text-violet-500",  label: "Content" },
  billing: { icon: Database, bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Billing" },
};

function AdminAuditLogsPage() {
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<string>("all");

  const filtered = DEMO_LOGS.filter((l) => {
    const matchSearch = !search || l.action.toLowerCase().includes(search.toLowerCase())
      || l.actor.toLowerCase().includes(search.toLowerCase())
      || l.target.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <ScrollText className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">Audit Logs</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">Track all important actions performed on the platform.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions, actors, targets…"
            className="w-full rounded-xl border border-input bg-card pl-9 pr-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {["all", "auth", "admin", "content", "billing"].map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === cat ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Category", "Action", "Actor", "Target", "IP", "Time"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log) => {
                const cfg = CATEGORY_CONFIG[log.category];
                return (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{log.action}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <User className="h-3 w-3" /> {log.actor}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{log.target}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{log.ip}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {log.ts}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No log entries match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {DEMO_LOGS.length} entries · Demo data shown — real logs populate as the platform is used
        </div>
      </div>
    </div>
  );
}

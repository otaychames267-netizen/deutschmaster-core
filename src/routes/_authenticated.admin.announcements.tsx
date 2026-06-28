import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Megaphone, Plus, Trash2, Eye, Clock, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: AdminAnnouncementsPage,
});

interface Announcement {
  id: string;
  title: string;
  body: string;
  target: "all" | "subscribers" | "trial";
  active: boolean;
  createdAt: string;
}

const DEMO: Announcement[] = [
  {
    id: "1",
    title: "Welcome to AuraLingovia Beta",
    body: "We are excited to launch the platform. Please share feedback to help us improve!",
    target: "all",
    active: true,
    createdAt: "2026-06-01",
  },
  {
    id: "2",
    title: "New TELC B2 Practice Exams Added",
    body: "We have uploaded 5 new full practice exams. Check the PDF Library!",
    target: "subscribers",
    active: true,
    createdAt: "2026-06-15",
  },
];

const TARGET_LABELS: Record<string, string> = {
  all:         "All users",
  subscribers: "Subscribers only",
  trial:       "Trial users",
};

function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEMO);
  const [showForm, setShowForm]           = useState(false);
  const [title, setTitle]                 = useState("");
  const [body, setBody]                   = useState("");
  const [target, setTarget]               = useState<"all" | "subscribers" | "trial">("all");

  function handleCreate() {
    if (!title || !body) { toast.error("Title and body are required."); return; }
    const item: Announcement = {
      id: Date.now().toString(),
      title, body, target, active: true,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setAnnouncements((prev) => [item, ...prev]);
    setTitle(""); setBody(""); setTarget("all"); setShowForm(false);
    toast.success("Announcement published.");
  }

  function handleDelete(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    toast.success("Announcement removed.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <Megaphone className="h-5 w-5 text-amber-500" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-foreground">Announcements</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">Broadcast messages to your users.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors">
          <Plus className="h-4 w-4" /> New announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active",        value: announcements.filter(a => a.active).length, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "All users",     value: announcements.filter(a => a.target === "all").length, icon: Users, color: "text-blue-500 bg-blue-500/10" },
          { label: "Subscribers",   value: announcements.filter(a => a.target === "subscribers").length, icon: Eye, color: "text-amber-500 bg-amber-500/10" },
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
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
          <p className="font-bold text-foreground">New announcement</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Message</label>
            <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do you want to announce?"
              className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Target audience</label>
            <select value={target} onChange={(e) => setTarget(e.target.value as "all" | "subscribers" | "trial")}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors">
              <option value="all">All users</option>
              <option value="subscribers">Subscribers only</option>
              <option value="trial">Trial users</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleCreate}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition-colors">
              Publish
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {announcements.map((ann) => (
          <div key={ann.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Megaphone className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground">{ann.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {TARGET_LABELS[ann.target]}
                  </span>
                  <button onClick={() => handleDelete(ann.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ann.body}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {ann.createdAt}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

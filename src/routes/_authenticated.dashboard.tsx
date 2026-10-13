import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useB1Visible } from "@/lib/useB1Visible";
import { GraduationCap, ChevronRight, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: LevelGatePage,
});

const CARDS: { value: "TELC_B1" | "TELC_B2"; seg: "b1" | "b2"; badge: string; label: string; desc: string; gradient: string }[] = [
  { value: "TELC_B1", seg: "b1", badge: "B1", label: "B1 Level", desc: "Grundlegende Sprachverwendung", gradient: "from-blue-600 via-blue-500 to-cyan-500" },
  { value: "TELC_B2", seg: "b2", badge: "B2", label: "B2 Level", desc: "Selbstständige Sprachverwendung", gradient: "from-rose-700 via-rose-500 to-pink-400" },
];

/** Regular students never see a level chooser here: their course was fixed
 * once at onboarding (`profiles.level`), so this page just forwards them
 * straight to `/$level/dashboard`. Only admins keep the two-card chooser
 * below, since they legitimately need to jump between B1 and B2 to work on
 * either course's content (see useB1Visible). */
function LevelGatePage() {
  const { level, isAdmin, roleLoading } = useAuth();
  const nav = useNavigate();
  const b1Visible = useB1Visible();

  if (roleLoading) return null;

  if (!isAdmin) {
    const seg = level === "TELC_B1" ? "b1" : "b2";
    return <Navigate to="/$level/dashboard" params={{ level: seg }} replace />;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center py-10">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
          <GraduationCap className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Choose your course</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          B1 and B2 are separate courses with their own content. Pick one to continue.
        </p>
      </div>

      <div className="grid w-full gap-5 sm:grid-cols-2">
        {CARDS.map((c) => {
          const locked = c.value === "TELC_B1" && !b1Visible;
          return (
          <button
            key={c.value}
            disabled={locked}
            aria-disabled={locked}
            onClick={() => { if (!locked) nav({ to: "/$level/dashboard", params: { level: c.seg } }); }}
            className={`group relative flex flex-col items-start gap-5 overflow-hidden rounded-3xl bg-gradient-to-br ${c.gradient} p-7 text-left text-white shadow-xl transition-all duration-300 ${
              locked ? "cursor-not-allowed opacity-60 grayscale" : "hover:-translate-y-1.5 hover:shadow-2xl"
            }`}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

            <div className="relative flex w-full items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-black backdrop-blur-sm ring-1 ring-white/25">
                {c.badge}
              </div>
              {locked ? (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
                  Coming Soon
                </span>
              ) : level === c.value && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
                  Onboarding pick
                </span>
              )}
            </div>

            <div className="relative flex-1">
              <p className="text-2xl font-black tracking-tight">{c.label}</p>
              <p className="mt-1.5 text-sm text-white/70">{c.desc}</p>
            </div>

            <div className="relative flex items-center gap-1.5 text-sm font-bold">
              {locked ? (
                <>Coming soon <Clock className="h-4 w-4" /></>
              ) : (
                <>Enter course <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}

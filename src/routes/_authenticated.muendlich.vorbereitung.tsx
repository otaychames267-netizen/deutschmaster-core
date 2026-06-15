import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Speech, MessageSquare, Users } from "lucide-react";
import { SectionHeader, ModuleGroupWithProgress, PartCard } from "@/components/section/SectionShell";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung")({
  head: () => ({ meta: [{ title: "Mündlich — Vorbereitung" }] }),
  component: MuendlichVorbereitung,
});

function MuendlichVorbereitung() {
  const { user } = useAuth();
  const [level, setLevel] = useState<"b1" | "b2">("b2");
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("level").eq("id", user.id).maybeSingle()
      .then(({ data }) => setLevel(data?.level === "TELC_B1" ? "b1" : "b2"));
  }, [user]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "dm-last-activity",
        JSON.stringify({ label: "Mündlich → Vorbereitung", to: "/muendlich/vorbereitung" })
      );
    } catch {}
  }, []);
  const link = (t: number) => `/practice/${level}/muendlich/${t}`;
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <SectionHeader
        icon={GraduationCap}
        title="Vorbereitung — Mündlich"
        subtitle="Übe jeden Teil der mündlichen Prüfung einzeln."
        backTo="/muendlich"
        backLabel="Zurück zu Mündlich"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Mündlich", to: "/muendlich" },
          { label: "Vorbereitung" },
        ]}
      />

      <ModuleGroupWithProgress title="Prüfungsteile" progress={0}>
        <PartCard icon={Speech} title="Teil 1 — Präsentation" desc="Strukturiertes Kurzreferat mit Redemitteln." to={link(1)} />
        <PartCard icon={MessageSquare} title="Teil 2 — Diskussion" desc="Argumente und Gegenargumente formulieren." to={link(2)} />
        <PartCard icon={Users} title="Teil 3 — Planen" desc="Gemeinsam etwas mit einer Partnerin / einem Partner planen." to={link(3)} />
      </ModuleGroupWithProgress>
    </div>
  );
}
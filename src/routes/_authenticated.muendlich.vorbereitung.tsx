import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Speech, MessageSquare, Users } from "lucide-react";
import { SectionHeader, ModuleGroupWithProgress, PartCard } from "@/components/section/SectionShell";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung")({
  head: () => ({ meta: [{ title: "Mündlich — Vorbereitung" }] }),
  component: MuendlichVorbereitung,
});

function MuendlichVorbereitung() {
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
        <PartCard icon={Speech} title="Teil 1 — Präsentation" desc="Strukturiertes Kurzreferat mit Redemitteln." progress={0} />
        <PartCard icon={MessageSquare} title="Teil 2 — Diskussion" desc="Argumente und Gegenargumente formulieren." locked="premium" />
        <PartCard icon={Users} title="Teil 3 — Planen" desc="Gemeinsam etwas mit einer Partnerin / einem Partner planen." locked="platinum" />
      </ModuleGroupWithProgress>
    </div>
  );
}
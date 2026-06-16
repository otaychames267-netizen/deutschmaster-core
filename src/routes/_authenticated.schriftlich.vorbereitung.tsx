import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, BookOpen, Puzzle, Headphones, Edit3 } from "lucide-react";
import { SectionHeader, ModuleGroupWithProgress, PartCard } from "@/components/section/SectionShell";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung")({
  head: () => ({ meta: [{ title: "Schriftlich — Vorbereitung" }] }),
  component: SchriftlichVorbereitung,
});

function SchriftlichVorbereitung() {
  const { user } = useAuth();
  const [level, setLevel] = useState<"b1" | "b2">("b2");
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("level").eq("id", user.id).maybeSingle()
      .then(({ data }) => setLevel(data?.level === "TELC_B1" ? "b1" : "b2"));
  }, [user?.id]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "dm-last-activity",
        JSON.stringify({ label: "Schriftlich → Vorbereitung", to: "/schriftlich/vorbereitung" })
      );
    } catch {}
  }, []);
  const link = (mod: string, t: number) => `/practice/${level}/${mod}/${t}`;
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <SectionHeader
        icon={GraduationCap}
        title="Vorbereitung — Schriftlich"
        subtitle="Übungen pro Prüfungsteil. Wähle einen Bereich."
        backTo="/schriftlich"
        backLabel="Zurück zu Schriftlich"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Schriftlich", to: "/schriftlich" },
          { label: "Vorbereitung" },
        ]}
      />

      <ModuleGroupWithProgress title="Lesen" progress={0}>
        <PartCard icon={BookOpen} title="Teil 1" desc="Globalverständnis — Überschriften zuordnen." to={link("lesen", 1)} />
        <PartCard icon={BookOpen} title="Teil 2" desc="Detailverständnis — Aussagen prüfen." to={link("lesen", 2)} />
        <PartCard icon={BookOpen} title="Teil 3" desc="Selektives Lesen — Anzeigen & Texte." to={link("lesen", 3)} />
      </ModuleGroupWithProgress>

      <ModuleGroupWithProgress title="Sprachbausteine" progress={0}>
        <PartCard icon={Puzzle} title="Teil 1" desc="Grammatik — Lückentext mit Auswahl." to={link("sprachbausteine", 1)} />
        <PartCard icon={Puzzle} title="Teil 2" desc="Wortschatz — Passende Wörter einsetzen." to={link("sprachbausteine", 2)} />
      </ModuleGroupWithProgress>

      <ModuleGroupWithProgress title="Hören" progress={0}>
        <PartCard icon={Headphones} title="Teil 1" desc="Globalverständnis — Kurze Ansagen." to={link("hoeren", 1)} />
        <PartCard icon={Headphones} title="Teil 2" desc="Detailverständnis — Gespräche." to={link("hoeren", 2)} />
        <PartCard icon={Headphones} title="Teil 3" desc="Selektives Hören — Interviews & Berichte." to={link("hoeren", 3)} />
      </ModuleGroupWithProgress>

      <ModuleGroupWithProgress title="Schreiben" progress={0}>
        <PartCard icon={Edit3} title="Brief / E-Mail" desc="Formelles und halbformelles Schreiben." to={link("schreiben", 1)} />
      </ModuleGroupWithProgress>
    </div>
  );
}
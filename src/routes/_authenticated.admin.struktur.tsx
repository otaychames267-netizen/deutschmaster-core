import { createFileRoute } from "@tanstack/react-router";
import { PenLine } from "lucide-react";
import { StrukturCatalog } from "@/components/schreiben/StrukturCatalog";

export const Route = createFileRoute("/_authenticated/admin/struktur")({
  component: StrukturCapacityPage,
});

/**
 * Struktur capacity — every personal Struktur card (B1: 500 in two pools, B2: Produkt + Dienstleistung), how many each topic still has and
 * how many already went to students. Admins can open ANY card and read it. All the logic lives in StrukturCatalog (shared with the B1
 * "Meine Struktur" page, where an admin sees the same catalog with the given-away cards locked).
 */
function StrukturCapacityPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <div>
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-black tracking-tight text-foreground">Struktur capacity</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Every personal Struktur card and how many are left / already went to students. B1: two groups of 250 letters (Brief A and Brief B). B2: Produkt 150 and Dienstleistung 150. Every letter is one number; a letter given to a student turns red. Click a number to read it.
        </p>
        <p dir="rtl" className="mt-0.5 text-sm text-muted-foreground">كل الـ Struktur وكم بقى وكم ذهب. B1: مجموعتين 250 + 250. B2: Produkt 150 و Dienstleistung 150. كل رسالة رقم، واللي تتعطى لمشارك تولّي حمراء. اضغط على رقم باش تقرا الرسالة.</p>
      </div>
      <StrukturCatalog sets={["b1all", "b1a", "b1b", "b2p", "b2d"]} />
    </div>
  );
}

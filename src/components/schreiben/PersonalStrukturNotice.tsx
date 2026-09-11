/**
 * PersonalStrukturNotice — the fixed privacy/exclusivity banner shown above
 * a subscriber's personal Produkt/Service Struktur. Owner spec 2026-09-11:
 * every subscriber must clearly see that their two structures are theirs
 * alone, not a shared template, and must not be redistributed.
 */
import { Lock } from "lucide-react";

const HIGHLIGHTS = [
  "Persönlich für dich",
  "Nur für deine eigene Prüfungsvorbereitung",
  "Jeder Nutzer erhält unterschiedliche Strukturen",
];

export function PersonalStrukturNotice() {
  return (
    <div className="rounded-2xl border border-amber-600/25 bg-amber-600/5 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600/15">
          <Lock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          Diese beiden Strukturen wurden ausschließlich für dich persönlich bereitgestellt und sind nur für
          deine eigene Prüfungsvorbereitung bestimmt. Bitte teile sie nicht mit anderen Personen und
          veröffentliche oder verbreite sie nicht. Jeder Nutzer der Plattform erhält eigene, individuelle
          Strukturen.
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-11">
        {HIGHLIGHTS.map((h) => (
          <span
            key={h}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400"
          >
            🔒 {h}
          </span>
        ))}
      </div>
    </div>
  );
}

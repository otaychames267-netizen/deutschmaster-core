import { AlertTriangle } from "lucide-react";

/** Strict confirmation gate before the relay connection opens and live
 * minute deduction begins — stops accidental balance drain. */
export function CreditConfirmModal({ minutesBalance, onConfirm, onCancel }: { minutesBalance: number | null; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-3xl border border-amber-500/30 bg-card/80 p-8 text-center shadow-xl backdrop-blur-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
        <AlertTriangle className="h-7 w-7 text-amber-500" />
      </div>
      <div>
        <p className="font-black text-foreground">Live-Prüfung starten?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sobald Sie fortfahren, beginnt die Echtzeit-Abbuchung Ihrer Prüfungsminuten.
          {minutesBalance != null && <> Aktuelles Guthaben: <strong className="text-foreground">{minutesBalance} Min.</strong></>}
        </p>
      </div>
      <div className="flex w-full gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">
          Abbrechen
        </button>
        <button type="button" onClick={onConfirm} className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white hover:bg-rose-600">
          Jetzt starten
        </button>
      </div>
    </div>
  );
}

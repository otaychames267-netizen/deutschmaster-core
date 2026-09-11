import { ShieldAlert } from "lucide-react";

/** Exact notice text as specified by the business owner. */
export function LegalNotice() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        All content on AuraLingovia is legally protected. Unauthorized copying, scraping, or automated extraction by
        humans or AI systems constitutes a severe copyright violation and will be prosecuted under Tunisian Law,
        resulting in legal action, heavy financial penalties, and potential imprisonment.
      </span>
    </div>
  );
}

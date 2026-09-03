import { Info, Sparkles } from "lucide-react";
import { NOTICE_TEXT } from "@/lib/notice-group";

/** Two distinct roles depending on `hiddenCount`:
 *  - hiddenCount > 0 (the default now — see SHOW_UNRELEASED_CONTENT):
 *    the "not yet introduced in Tunisia" items were dropped from the list
 *    entirely, this renders a professional "Coming Soon" notice in their
 *    place — no titles, no hint of what's hidden, just that more is coming.
 *  - hiddenCount omitted/0: legacy path for callers passing `{ reveal: true }`
 *    (Hören Teil 1) — the original Arabic notice, items still listed below. */
export function NoticeGroupBanner({ hiddenCount }: { hiddenCount?: number }) {
  if (hiddenCount && hiddenCount > 0) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
        <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Coming Soon</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            More exercises are being prepared and will be available in a future update.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4">
      <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
      <p className="flex-1 text-sm font-bold leading-relaxed text-amber-700 dark:text-amber-400" dir="rtl">
        {NOTICE_TEXT}
      </p>
    </div>
  );
}

import { Info } from "lucide-react";
import { NOTICE_TEXT } from "@/lib/notice-group";

/** Marks the start of the "not yet introduced in Tunisia" exercise group on
 * every student-facing Lesen/Hören/Sprachbausteine list — the exercises
 * below it stay fully unlocked, this is informational only. */
export function NoticeGroupBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4">
      <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
      <p className="flex-1 text-sm font-bold leading-relaxed text-amber-700 dark:text-amber-400" dir="rtl">
        {NOTICE_TEXT}
      </p>
    </div>
  );
}

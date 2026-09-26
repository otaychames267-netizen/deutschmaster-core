import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { recordProtectionEvent } from "@/lib/content-protection/protection.functions";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (EDITABLE_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return !!el.closest?.('[data-protection-exempt="true"]');
}

/**
 * DOM-level deterrents for protected exercise content: blocks right-click,
 * copy/cut, and the common save/print/devtools keyboard shortcuts, and
 * reports each trip (throttled client-side) so the server-side escalation
 * ladder in suspension.server.ts can act on genuinely abusive bursts.
 *
 * Explicitly does NOT apply inside form fields / the Schreiben essay editor
 * (isEditableTarget) — this suite protects read-only exercise content, not
 * the student's own writing input.
 *
 * Honesty check for whoever reads this later: none of this is real
 * security. A right-click block or a blocked Ctrl+S is trivially bypassed
 * by disabling JS, reading the network tab, or just typing the text back
 * out. The actual security boundary is server-side (RLS, signed URLs,
 * server-side grading, the rate limiting in protection.functions.ts) — this
 * hook is a deterrent for casual copying plus a signal source for the
 * escalation ladder, not a barrier against a determined technical user.
 */
export function useContentProtection(enabled: boolean) {
  const lastReportRef = useRef<Record<string, number>>({});
  const devtoolsWarnedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    function report(eventType: string) {
      const now = Date.now();
      const last = lastReportRef.current[eventType] ?? 0;
      if (now - last < 8000) return; // client-side cooldown per event type
      lastReportRef.current[eventType] = now;
      recordProtectionEvent({ data: { eventType, route: window.location.pathname } }).catch(() => {
        /* best-effort — a reporting hiccup must never block the page */
      });
    }

    function onContextMenu(e: MouseEvent) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      toast.info("Right-click is disabled on protected content.");
      report("contextmenu_blocked");
    }

    function onCopy(e: ClipboardEvent) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      toast.info("Copying is disabled on protected content.");
      report("copy_blocked");
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const blockPrint = key === "p" && (e.ctrlKey || e.metaKey);
      const blockSave = key === "s" && (e.ctrlKey || e.metaKey);
      const blockViewSource = key === "u" && (e.ctrlKey || e.metaKey);
      const blockDevtools =
        key === "f12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key));
      if (blockPrint || blockSave || blockViewSource || blockDevtools) {
        e.preventDefault();
        report(blockPrint ? "print_attempt" : "keyboard_shortcut_blocked");
        if (blockPrint) toast.info("Printing is disabled on protected content.");
      }
    }

    // Soft DevTools heuristic — logged for visibility only, never feeds the
    // escalation ladder (see suspension.server.ts's header comment on why).
    const devtoolsInterval = setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const likelyOpen = widthDiff > 160 || heightDiff > 160;
      if (likelyOpen && !devtoolsWarnedRef.current) {
        devtoolsWarnedRef.current = true;
        report("devtools_heuristic");
      } else if (!likelyOpen) {
        devtoolsWarnedRef.current = false;
      }
    }, 3000);

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("keydown", onKeyDown);
      clearInterval(devtoolsInterval);
    };
  }, [enabled]);
}

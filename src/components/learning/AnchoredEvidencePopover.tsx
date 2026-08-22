/**
 * Small floating popover showing the compact EvidenceBlock card already
 * expanded — the click that opened the popover IS the "Warum?" trigger, so
 * a second nested click would be redundant. Shared by Sprachbausteine T1
 * and T2, which both replace a separate results table with this inline,
 * per-gap explanation popover.
 *
 * Rendered through a portal with `position: fixed`, coordinates computed
 * from the anchor's real screen position and clamped to the viewport —
 * NOT `position: absolute` inside the gap's own inline span. A gap sits in
 * the middle of flowing paragraph text, so anchoring a ~320px-wide card
 * directly to that tiny inline element (the original approach) let the
 * card overlap the surrounding sentence instead of floating cleanly above
 * it, especially on narrow screens. On mobile it renders as a bottom sheet
 * instead of a floating card — trying to float-position a wide card off a
 * point that could be anywhere in the paragraph is fundamentally fragile
 * on a 375px-wide screen, so it doesn't try.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { EvidenceBlock } from "./EvidenceBlock";
import { useIsMobile } from "@/hooks/use-mobile";
import type { LearningAidsItem, SavedExpressionCategory, Skill } from "./types";

interface Props {
  aids: LearningAidsItem | null | undefined;
  variant: "wrong" | "correct";
  skill: Skill;
  exerciseId: string;
  itemKey: string;
  saveCategory?: SavedExpressionCategory;
  yourAnswerText?: string | null;
  correctAnswerText?: string | null;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

const MARGIN = 8;
const POPOVER_WIDTH = 320;

export function AnchoredEvidencePopover({
  aids,
  variant,
  skill,
  exerciseId,
  itemKey,
  saveCategory,
  yourAnswerText,
  correctAnswerText,
  onClose,
  anchorEl,
}: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [style, setStyle] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (isMobile || !anchorEl) return;
    function place() {
      const rect = anchorEl!.getBoundingClientRect();
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - MARGIN * 2);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.min(Math.max(left, MARGIN), window.innerWidth - width - MARGIN);

      const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
      const spaceAbove = rect.top - MARGIN;
      const popHeight = popRef.current?.offsetHeight ?? 0;
      const openUpward = popHeight > spaceBelow && spaceAbove > spaceBelow;
      const top = openUpward ? Math.max(rect.top - popHeight - 6, MARGIN) : rect.bottom + 6;
      const maxHeight = openUpward ? spaceAbove : spaceBelow;

      setStyle({ top, left, maxHeight: Math.max(maxHeight, 160) });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorEl, isMobile]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorEl && !anchorEl.contains(e.target as Node)
      ) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorEl]);

  const card = (
    <EvidenceBlock
      aids={aids}
      variant={variant}
      skill={skill}
      exerciseId={exerciseId}
      itemKey={itemKey}
      saveCategory={saveCategory}
      yourAnswerText={yourAnswerText}
      correctAnswerText={correctAnswerText}
      defaultOpen
    />
  );

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div
          ref={popRef}
          role="dialog"
          className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            <button onClick={onClose} aria-label="Schließen" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {card}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      className="fixed z-50 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
      style={style ? { top: style.top, left: style.left, width: POPOVER_WIDTH, maxWidth: `calc(100vw - ${MARGIN * 2}px)`, maxHeight: style.maxHeight } : { visibility: "hidden", top: 0, left: 0, width: POPOVER_WIDTH }}
    >
      <div className="p-1.5">{card}</div>
    </div>,
    document.body,
  );
}

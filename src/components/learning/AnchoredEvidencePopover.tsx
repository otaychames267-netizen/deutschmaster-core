/**
 * Small floating popover anchored under a gap button, showing the compact
 * EvidenceBlock card already expanded — the click that opened the popover
 * IS the "Warum?" trigger, so a second nested click would be redundant.
 * Shared by Sprachbausteine T1 and T2, which both replace a separate
 * results table with this inline, per-gap explanation popover.
 */
import { useRef, useEffect } from "react";
import { EvidenceBlock } from "./EvidenceBlock";
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

  return (
    <div ref={popRef} className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1.5 w-[min(88vw,20rem)]">
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
    </div>
  );
}

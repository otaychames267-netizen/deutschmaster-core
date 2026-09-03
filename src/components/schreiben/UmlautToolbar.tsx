/**
 * German special-character insertion for Schreiben textareas.
 *
 * Many students write on keyboards without direct ä/ö/ü/ß keys. This gives
 * every free-text Schreiben surface (practice writing prompts, the
 * Prüfungssimulation essay) one shared, consistent toolbar that inserts the
 * clicked character at the current cursor position of the controlled
 * textarea — never appends to the end, never touches the rest of the text.
 */
import { useCallback, type RefObject } from "react";

export const UMLAUT_CHARS = ["ä", "ö", "ü", "Ä", "Ö", "Ü", "ß"] as const;

/**
 * Cursor-aware insertion for a controlled `<textarea value={value}
 * onChange={...}>`. Reads the DOM node's live selection (React doesn't
 * expose this), splices the character in, calls the same `onChange` the
 * textarea itself uses (so all existing text is preserved exactly), and —
 * once the re-render with the new value has painted — restores focus and
 * places the caret immediately after the inserted character.
 */
export function useUmlautInsertion(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (next: string) => void,
) {
  return useCallback(
    (char: string) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const next = value.slice(0, start) + char + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (!node) return;
        node.focus();
        const pos = start + char.length;
        node.setSelectionRange(pos, pos);
      });
    },
    [textareaRef, value, onChange],
  );
}

export function UmlautToolbar({ onInsert, disabled }: { onInsert: (char: string) => void; disabled?: boolean }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="toolbar"
      aria-label="Deutsche Sonderzeichen einfügen"
    >
      {UMLAUT_CHARS.map((char) => (
        <button
          key={char}
          type="button"
          disabled={disabled}
          // Prevent the textarea from losing focus/selection before the
          // click's onInsert runs — mousedown fires before the textarea's
          // blur, so this is what keeps selectionStart/selectionEnd valid.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(char)}
          aria-label={`${char} einfügen`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {char}
        </button>
      ))}
    </div>
  );
}

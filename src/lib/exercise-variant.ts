/**
 * Parses the Original/Modified/NEW markers that live directly in exercise
 * titles across lesen_exercises, sb_exercises, and hoeren_exercises. Titles
 * accumulated several conventions across import batches — plain "(معدل)",
 * the definite-article form "(المعدل)", numbered variants "(معدل 1)"/
 * "(معدل 2)", parenthetical asides "(معدل - Variante 2)", and a
 * dash-suffix form with no parens at all ("Suza Hotop - المعدل") — so this
 * matches all of them rather than only the single exact "(معدل)" shape.
 * Arabic letters aren't \w for regex \b purposes, so boundaries below use
 * explicit whitespace/paren anchors instead of \b around Arabic text.
 * This strips whichever marker matched from the displayed title and
 * returns it as structured data so callers can render a proper badge
 * instead of raw parenthetical text.
 */
export interface VariantInfo {
  /** Title with the ( Original )/(معدل)/( Neu ... ) marker stripped. */
  baseTitle: string;
  variant: "original" | "modified" | null;
  isNew: boolean;
}

export function parseVariant(title: string): VariantInfo {
  const isNew = /\(\s*neu\b[^)]*\)/i.test(title);
  let working = title.replace(/\(\s*neu\b[^)]*\)/i, "").trim();

  let variant: VariantInfo["variant"] = null;
  // Parenthetical modified: "(معدل)", "(المعدل)", "(معدل 1)", "(معدل - Variante 2)".
  const modParenMatch = working.match(/^(.*?)\s*\(\s*(?:ال)?معدل(?:\s[^)]*)?\)\s*$/);
  // Dash-suffix modified with no parens: "Suza Hotop - المعدل".
  const modDashMatch = working.match(/^(.*?)\s*-\s*(?:ال)?معدل\s*$/);
  const origMatch = working.match(/^(.*?)\s*\(\s*original\s*\)\s*$/i);
  if (modParenMatch) {
    variant = "modified";
    working = modParenMatch[1].trim();
  } else if (modDashMatch) {
    variant = "modified";
    working = modDashMatch[1].trim();
  } else if (origMatch) {
    variant = "original";
    working = origMatch[1].trim();
  }
  // A few legacy titles carry a stray leading dash unrelated to any marker
  // (e.g. "-Karneval von Unna (معدل)") — harmless to also tidy up here.
  working = working.replace(/^-\s*/, "").trim();

  return { baseTitle: working, variant, isNew };
}

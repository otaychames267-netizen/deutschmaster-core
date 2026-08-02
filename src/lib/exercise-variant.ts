/**
 * Parses the Original/Modified/NEW markers that live directly in exercise
 * titles for lesen_exercises and sprachbausteine tables (unlike
 * hoeren_exercises, which has structured version_tag/variant_group columns
 * — see 20260706120000_hoeren.sql). Titles look like "Parkuhren ( Original )",
 * "Parkuhren (معدل)", "Ab wann ist Kaffee ungesund? ( Neu )". This strips the
 * marker from the displayed title and returns it as structured data so
 * callers can render a proper badge instead of raw parenthetical text.
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
  const modMatch = working.match(/^(.*?)\s*\(\s*معدل\s*\)\s*$/);
  const origMatch = working.match(/^(.*?)\s*\(\s*original\s*\)\s*$/i);
  if (modMatch) {
    variant = "modified";
    working = modMatch[1].trim();
  } else if (origMatch) {
    variant = "original";
    working = origMatch[1].trim();
  }

  return { baseTitle: working, variant, isNew };
}

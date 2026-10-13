import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escapes characters that are syntactically significant in PostgREST's
 * .or()/.filter() string DSL (comma separates conditions, parens group
 * them, backslash is the escape char itself) before interpolating raw
 * user input into a filter string. Without this, a search term containing
 * "," or ")" can inject additional filter clauses.
 */
export function escapePostgrestFilterValue(value: string): string {
  return value.replace(/[\\,()]/g, (c) => `\\${c}`);
}

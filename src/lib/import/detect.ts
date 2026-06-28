/**
 * detect.ts — discover TELC PDFs and infer their section / Teil from the file.
 *
 * Generic: scans the user's Desktop for any folder that looks like a TELC PDF
 * folder, lists the PDFs, and classifies each by filename. No hardcoded names.
 */
import { readdir } from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

export type Section = "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";

export interface DetectedPdf {
  filePath: string;
  fileName: string;
  folder: string;
  section: Section | null;
  teil: number | null;
}

/** Find Desktop folders whose name contains both "telc" and "pdf". */
export async function findTelcFolders(root?: string): Promise<string[]> {
  const desktop = root ?? path.join(os.homedir(), "Desktop");
  let entries: string[] = [];
  try { entries = await readdir(desktop); } catch { return []; }
  const out: string[] = [];
  for (const name of entries) {
    if (/telc/i.test(name) && /pdf/i.test(name)) out.push(path.join(desktop, name));
  }
  return out;
}

export function detectSection(name: string): Section | null {
  const n = name.toLowerCase();
  if (/lesen|leseverstehen/.test(n)) return "lesen";
  if (/sprachbaustein|spachbaustein/.test(n)) return "sprachbausteine"; // note: handle user's typo folder
  if (/h(ö|oe|o)r/.test(n)) return "hoeren";
  if (/schreib/.test(n)) return "schreiben";
  if (/m(ü|ue)ndlich|sprechen/.test(n)) return "muendlich";
  return null;
}

export function detectTeil(name: string): number | null {
  const m = name.toLowerCase().match(/teil\s*([1-3])/);
  return m ? parseInt(m[1]) : null;
}

/** Scan all TELC folders and return every detected PDF, classified. */
export async function scanTelcPdfs(root?: string): Promise<DetectedPdf[]> {
  const folders = await findTelcFolders(root);
  const out: DetectedPdf[] = [];
  for (const folder of folders) {
    let files: string[] = [];
    try { files = await readdir(folder); } catch { continue; }
    for (const f of files) {
      if (!/\.pdf$/i.test(f)) continue;
      // Section can come from folder name or file name; prefer folder, fall back to file.
      const section = detectSection(folder) ?? detectSection(f);
      const teil = detectTeil(f) ?? detectTeil(folder);
      out.push({ filePath: path.join(folder, f), fileName: f, folder, section, teil });
    }
  }
  return out.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

/**
 * storage.ts — upload/locate source PDF page images in Supabase Storage.
 *
 * Generic: works for every section/Teil/PDF without code changes. Path layout:
 *   <section>/teil-<n>/<pdf-slug>/page-<num>.png
 *   e.g.  lesen/teil-2/lesen-teil-2-1/page-15.png
 *
 * The importer (service role) uploads; the in-app review screen reads via signed
 * URLs (admin RLS). No exercise content is ever promoted here.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const IMPORT_BUCKET = "import-pages";

export function adminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Filesystem/URL-safe slug from a PDF file name. */
export function slugify(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Build the storage object path for one page image. */
export function pageImagePath(section: string, teil: number | null | undefined, pdfName: string, pageNum: number): string {
  const teilSeg = teil != null ? `teil-${teil}` : "teil-x";
  return `${section}/${teilSeg}/${slugify(pdfName)}/page-${pageNum}.png`;
}

/**
 * Upload a page image (idempotent: upsert). Returns the storage path on success.
 */
export async function uploadPageImage(
  client: SupabaseClient,
  section: string,
  teil: number | null | undefined,
  pdfName: string,
  pageNum: number,
  png: Buffer,
): Promise<string> {
  const path = pageImagePath(section, teil, pdfName, pageNum);
  const { error } = await client.storage.from(IMPORT_BUCKET).upload(path, png, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
  return path;
}

/** Create a temporary signed URL for an admin to view a page image. */
export async function signedPageUrl(client: SupabaseClient, path: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await client.storage.from(IMPORT_BUCKET).createSignedUrl(path, expiresInSec);
  if (error || !data) throw new Error(`signedUrl ${path}: ${error?.message}`);
  return data.signedUrl;
}

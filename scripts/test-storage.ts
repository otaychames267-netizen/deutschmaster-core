import "dotenv/config";
import { extractPageImagePng } from "../src/lib/import/gemini-vision.js";
import { adminClient, uploadPageImage, signedPageUrl, pageImagePath, IMPORT_BUCKET } from "../src/lib/import/storage.js";

async function main() {
  const pdf = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 2 (1).pdf";
  const pdfName = "lesen teil 2 (1).pdf";
  const db = adminClient();

  // ensure bucket visible
  const { data: buckets } = await db.storage.listBuckets();
  console.log("buckets:", (buckets ?? []).map((b) => `${b.id}(${b.public ? "public" : "private"})`).join(", "));

  const png = await extractPageImagePng(pdf, 15);
  const expected = pageImagePath("lesen", 2, pdfName, 15);
  console.log("expected path:", expected);

  const path = await uploadPageImage(db, "lesen", 2, pdfName, 15, png);
  console.log("uploaded:", path);

  const url = await signedPageUrl(db, path, 600);
  console.log("signed url (truncated):", url.slice(0, 90) + "...");

  // verify download works
  const res = await fetch(url);
  console.log(`download via signed url → HTTP ${res.status}, ${res.headers.get("content-type")}, ${(await res.arrayBuffer()).byteLength} bytes`);
}
main().catch((e) => { console.error("ERR", e); process.exit(1); });

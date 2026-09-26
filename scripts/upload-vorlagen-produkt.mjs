import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const pdfPath = "C:\\Users\\asus\\Desktop\\AuraLingovia Schreiben Vorlagen\\Beschwerden - Produkt\\AuraLingovia - Beschwerden Produkt (FINAL).pdf";
  const bytes = readFileSync(pdfPath);
  console.log(`Read ${bytes.length} bytes from ${pdfPath}`);

  const storagePath = "produkt/beschwerden-produkt-v1.pdf";
  const up = await db.storage.from("schreiben-vorlagen").upload(storagePath, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) throw up.error;
  console.log("Uploaded to:", up.data.path);

  const row = {
    category: "produkt",
    level: "TELC_B2",
    title: "Beschwerden — Produkt",
    description:
      "Ein komplettes Denksystem für TELC-B2-Produktbeschwerden: 10 wiederkehrende Situationen, sechs universelle Schreibstrategien, Platzhalter-Werkstatt und 60 vollständige Vorlagen-Einheiten.",
    situation_count: 10,
    template_count: 60,
    storage_path: storagePath,
    sort_order: 1,
  };

  const ins = await db
    .from("schreiben_vorlagen")
    .upsert(row, { onConflict: "category,level" })
    .select();
  if (ins.error) throw ins.error;
  console.log("DB row:", JSON.stringify(ins.data, null, 2));
}

main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});

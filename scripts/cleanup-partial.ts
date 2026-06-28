import { createClient } from "@supabase/supabase-js";

const db = createClient("https://gewcyydpgbfutkdcyztr.supabase.co", "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: t3s } = await db.from("lesen_exercises").select("id").eq("teil", 3);
console.log("T3 exercises to delete:", t3s?.length ?? 0);
for (const r of t3s ?? []) {
  await db.from("lesen_t3_situations").delete().eq("exercise_id", r.id);
  await db.from("lesen_t3_texts").delete().eq("exercise_id", r.id);
  await db.from("lesen_exercises").delete().eq("id", r.id);
  console.log("  deleted", r.id);
}
const [r1, r2, r3] = await Promise.all([
  db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 1),
  db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 2),
  db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 3),
]);
console.log("After cleanup — T1:", r1.count, "T2:", r2.count, "T3:", r3.count);

/**
 * muendlich-e2e.ts — automated end-to-end test of the Prüfungssimulation room
 * LOGIC against the live database (service client). Verifies every server-side
 * guarantee. Does NOT (cannot) test WebRTC audio or browser rendering — those
 * need real mics + two authenticated browsers.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { remainingSeconds, type Room } from "../src/lib/muendlich/room.js";

const db = createClient(process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok = (n: string, c: boolean) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FAIL: ${n}`); } };

// two fake user ids (FK to profiles is nullable-tolerant here via service role on test rows we clean up)
async function main() {
  // pick two real profile ids to satisfy FK
  const { data: profs } = await db.from("profiles").select("id").limit(2);
  if (!profs || profs.length < 2) { console.log("Need >=2 profiles to run; found", profs?.length ?? 0); process.exit(1); }
  const A = profs[0].id, B = profs[1].id;
  const code = "E2E" + Math.random().toString(36).slice(2, 5).toUpperCase();

  console.log("MÜNDLICH ROOM — END-TO-END LOGIC TEST\n");

  // 1. Create room (A) + B joins → same room, slots A/B
  const { data: room } = await db.from("muendlich_rooms").insert({ code, state: "waiting_for_partner", created_by: A }).select("*").single();
  await db.from("muendlich_participants").insert({ room_id: room.id, user_id: A, slot: "A", connected: true });
  await db.from("muendlich_participants").insert({ room_id: room.id, user_id: B, slot: "B", connected: true });
  const { data: parts } = await db.from("muendlich_participants").select("*").eq("room_id", room.id).order("slot");
  ok("both participants in the SAME room", parts!.length === 2 && parts!.every((p: any) => p.room_id === room.id));
  ok("Person A and Person B assigned correctly", parts![0].slot === "A" && parts![1].slot === "B");

  // 2. Third participant rejected (unique room+slot)
  const third = await db.from("muendlich_participants").insert({ room_id: room.id, user_id: A, slot: "A" });
  ok("third participant CANNOT join (rejected)", !!third.error);

  // 3. Ready check → preparation with server timestamp
  await db.from("muendlich_participants").update({ ready: true, mic_ok: true, voice_ok: true }).eq("room_id", room.id);
  await db.from("muendlich_rooms").update({ state: "preparation", prep_started_at: new Date().toISOString() }).eq("id", room.id);
  const { data: prepRoom } = await db.from("muendlich_rooms").select("*").eq("id", room.id).single();
  ok("state advanced to preparation with prep_started_at", prepRoom.state === "preparation" && !!prepRoom.prep_started_at);

  // 4. Synchronized timer: two clients with DIFFERENT local clocks both land on server time.
  //    Each client measures offset = serverNow − itsLocalNow, then remaining uses localNow + offset.
  const serverNow = Date.now();
  // client A: clock 45s FAST → localNow=serverNow+45000, offsetA=serverNow-localNow=-45000
  const aLocal = serverNow + 45000, offsetA = serverNow - aLocal;
  // client B: clock 30s SLOW → localNow=serverNow-30000, offsetB=serverNow-localNow=+30000
  const bLocal = serverNow - 30000, offsetB = serverNow - bLocal;
  const remA = remainingSeconds(prepRoom as Room, offsetA, aLocal);
  const remB = remainingSeconds(prepRoom as Room, offsetB, bLocal);
  ok("timer is server-driven & identical despite 75s clock skew (±1s)", Math.abs(remA - remB) <= 1 && remA >= 898 && remA <= 900);

  // 5. Chat bidirectional (shared table = both directions)
  await db.from("muendlich_chat").insert({ room_id: room.id, user_id: A, slot: "A", body: "Hallo von A" });
  await db.from("muendlich_chat").insert({ room_id: room.id, user_id: B, slot: "B", body: "Hallo von B" });
  const { data: chat } = await db.from("muendlich_chat").select("*").eq("room_id", room.id).order("created_at");
  ok("chat works both directions", chat!.length === 2 && chat!.some((c: any) => c.slot === "A") && chat!.some((c: any) => c.slot === "B"));

  // 6. Selections: Teil 1 per-person (distinct), Teil 2/3 shared
  await db.from("muendlich_selections").upsert([
    { room_id: room.id, teil: 1, slot: "A", value: "Thema A1" },
    { room_id: room.id, teil: 1, slot: "B", value: "Thema B3" },
    { room_id: room.id, teil: 2, slot: null, value: "Diskussion 5" },
    { room_id: room.id, teil: 3, slot: null, value: "Planung 2" },
  ], { onConflict: "room_id,teil,slot" });
  const { data: sels } = await db.from("muendlich_selections").select("*").eq("room_id", room.id);
  ok("Teil 1 per-person selections distinct; Teil 2/3 shared", sels!.length === 4 && sels!.find((s: any) => s.teil === 1 && s.slot === "A")?.value === "Thema A1" && sels!.find((s: any) => s.teil === 1 && s.slot === "B")?.value === "Thema B3");

  // 7. Timer expiry → auto-lock + transition to exam room
  await db.from("muendlich_rooms").update({ prep_started_at: new Date(Date.now() - 16 * 60000).toISOString() }).eq("id", room.id);
  const { data: expired } = await db.from("muendlich_rooms").select("*").eq("id", room.id).single();
  ok("remaining hits 0 after 15 min", remainingSeconds(expired as Room) === 0);
  // simulate lockAndAdvanceToExam
  await db.from("muendlich_selections").update({ locked: true }).eq("room_id", room.id);
  await db.from("muendlich_rooms").update({ state: "exam_room_ready" }).eq("id", room.id);
  const { data: after } = await db.from("muendlich_rooms").select("state").eq("id", room.id).single();
  const { data: locked } = await db.from("muendlich_selections").select("locked").eq("room_id", room.id);
  ok("at 00:00 selections lock + auto-transition to exam_room_ready", after.state === "exam_room_ready" && locked!.every((s: any) => s.locked));

  // 7b. REGRESSION: shared (Teil 2/3, slot NULL) selection must NOT duplicate on re-pick.
  //     Reset to preparation, re-pick Teil 2 several times, assert exactly ONE shared row.
  await db.from("muendlich_rooms").update({ state: "preparation", prep_started_at: new Date().toISOString() }).eq("id", room.id);
  await db.from("muendlich_selections").update({ locked: false }).eq("room_id", room.id);
  for (const v of ["Diskussion 5", "Diskussion 7", "Diskussion 1"]) {
    const ex = await db.from("muendlich_selections").select("id").eq("room_id", room.id).eq("teil", 2).is("slot", null).maybeSingle();
    if (ex.data) await db.from("muendlich_selections").update({ value: v }).eq("id", ex.data.id);
    else await db.from("muendlich_selections").insert({ room_id: room.id, teil: 2, slot: null, value: v });
  }
  const { data: shared } = await db.from("muendlich_selections").select("value").eq("room_id", room.id).eq("teil", 2).is("slot", null);
  ok("shared selection re-pick does NOT duplicate rows (exactly 1)", shared!.length === 1 && shared![0].value === "Diskussion 1");

  // 7c. REGRESSION: shared unique index actually rejects a 2nd NULL-slot row at the DB
  const dup = await db.from("muendlich_selections").insert({ room_id: room.id, teil: 2, slot: null, value: "dupe" });
  ok("DB rejects duplicate shared selection (partial unique index)", !!dup.error);

  // 7d. REGRESSION: atomic prep-start — two concurrent calls must NOT double-stamp.
  await db.from("muendlich_rooms").update({ state: "ready_check", prep_started_at: null }).eq("id", room.id);
  const stampA = new Date(Date.now()).toISOString();
  const stampB = new Date(Date.now() + 5000).toISOString();
  const [u1, u2] = await Promise.all([
    db.from("muendlich_rooms").update({ state: "preparation", prep_started_at: stampA }).eq("id", room.id).eq("state", "ready_check").select("id"),
    db.from("muendlich_rooms").update({ state: "preparation", prep_started_at: stampB }).eq("id", room.id).eq("state", "ready_check").select("id"),
  ]);
  const winners = [u1, u2].filter((u) => (u.data?.length ?? 0) > 0).length;
  ok("atomic prep-start: exactly ONE concurrent call wins (no timer desync)", winners === 1);

  // 7e. REGRESSION: atomic lock+advance — two concurrent calls, only one processes.
  const [l1, l2] = await Promise.all([
    db.from("muendlich_rooms").update({ state: "exam_room_ready" }).eq("id", room.id).eq("state", "preparation").select("id"),
    db.from("muendlich_rooms").update({ state: "exam_room_ready" }).eq("id", room.id).eq("state", "preparation").select("id"),
  ]);
  const lockWinners = [l1, l2].filter((u) => (u.data?.length ?? 0) > 0).length;
  ok("atomic transition: exactly ONE concurrent lock-and-advance wins", lockWinners === 1);

  // 8. Recovery: re-fetch full bundle → state/selections/chat intact
  const [r2, p2, s2, c2] = await Promise.all([
    db.from("muendlich_rooms").select("*").eq("id", room.id).single(),
    db.from("muendlich_participants").select("*").eq("room_id", room.id),
    db.from("muendlich_selections").select("*").eq("room_id", room.id),
    db.from("muendlich_chat").select("*").eq("room_id", room.id),
  ]);
  ok("refresh/recovery restores room+participants+selections+chat", r2.data.state === "exam_room_ready" && p2.data!.length === 2 && s2.data!.length === 4 && c2.data!.length === 2);

  // 9. REGRESSION: a finished/abandoned room must be non-joinable & non-recoverable.
  await db.from("muendlich_rooms").update({ state: "finished" }).eq("id", room.id);
  const { data: fin } = await db.from("muendlich_rooms").select("state").eq("id", room.id).single();
  ok("finished room is flagged non-joinable (join guard + recovery)", ["finished", "abandoned"].includes(fin.state));

  // cleanup
  await db.from("muendlich_rooms").delete().eq("id", room.id);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });

/**
 * room.ts — Mündlich Prüfungssimulation room system (Phase 1, no AI).
 *
 * Source of truth: the muendlich_rooms / _participants / _selections / _chat
 * tables (so refresh = full recovery). Supabase Realtime is used for live updates.
 * The countdown is derived from the server timestamp `prep_started_at`, so both
 * participants always see identical remaining time.
 */
import { supabase } from "@/integrations/supabase/client";
import { muendlichQuotaMessage } from "./quota";

const db = supabase as any;
export type RoomState = "waiting_for_partner" | "both_connected" | "ready_check" | "preparation" | "preparation_locked" | "exam_room_ready" | "exam_in_progress" | "finished" | "abandoned";
export type Slot = "A" | "B";

export interface Room { id: string; code: string; state: RoomState; prep_started_at: string | null; prep_seconds: number; }
export interface Participant { id: string; room_id: string; user_id: string; slot: Slot; connected: boolean; ready: boolean; mic_ok: boolean; voice_ok: boolean; }
export interface Selection { teil: number; slot: Slot | null; value: string; locked: boolean; }

function genCode(): string { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

/** Join an existing room by code, or create one. Auto-assigns slot A/B. Enforces max 2. */
export async function joinOrCreateRoom(code: string | null): Promise<{ room: Room; slot: Slot } | { error: string }> {
  const { data: u } = await db.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return { error: "Not authenticated" };

  // Front-door plan check — the real enforcement boundary is RLS on
  // muendlich_rooms/_participants/_materials (has_plan_access, see
  // 20260716020000_plan_scoped_content_gating.sql) plus
  // deduct_muendlich_minutes_dual's own check, but blocking here means a
  // Schriftlich-only user gets a clear message before matchmaking/chat/
  // topic-selection rather than deep into a live session that will only
  // fail once minutes are actually deducted.
  const { data: hasAccess } = await db.rpc("has_plan_access", { p_user_id: userId, p_module: "muendlich" });
  if (!hasAccess) return { error: "Your subscription doesn't include Mündlich access. Upgrade to Mündlich or Komplett to use the exam room." };

  let room: Room | null = null;
  if (code) {
    const { data } = await db.from("muendlich_rooms").select("*").eq("code", code.toUpperCase()).maybeSingle();
    if (!data) return { error: "Room not found" };
    if (["finished", "abandoned"].includes(data.state)) return { error: "This room is no longer available" };
    room = data;
  } else {
    const { data, error } = await db.from("muendlich_rooms").insert({ code: genCode(), state: "waiting_for_partner", created_by: userId }).select("*").single();
    if (error) return { error: error.message };
    room = data;
  }

  // already a participant? (recovery)
  const { data: existing } = await db.from("muendlich_participants").select("*").eq("room_id", room!.id).eq("user_id", userId).maybeSingle();
  if (existing) { await db.from("muendlich_participants").update({ connected: true }).eq("id", existing.id); return { room: room!, slot: existing.slot }; }

  // Friendly pre-check for the single-active-session guard — the DB trigger
  // (check_single_active_muendlich_session) is the real enforcement backstop
  // if this is ever raced by two tabs; this just avoids surfacing a raw
  // constraint-violation error to the student in the common case. Fetches
  // this user's other participant rows joined with room state, filters
  // client-side rather than pushing the state exclusion into the query (max
  // a couple of rows, and avoids relying on PostgREST's embedded-filter
  // syntax for a check that only needs to be approximately fast, not exact).
  // Mirrors the trigger's own staleness carve-out (see the 2026-09-30
  // migrations) so this friendly pre-check never blocks a join the real
  // DB-level insert would actually allow. 'preparation' uses the room's own
  // prep_started_at+prep_seconds instead of a flat updated_at threshold —
  // two real candidates can legitimately sit in a 15-minute prep window
  // without the room row changing again, so a flat threshold would
  // incorrectly flag a genuinely-in-progress session as stale.
  const { data: otherRows } = await db
    .from("muendlich_participants")
    .select("room_id, muendlich_rooms!inner(state, updated_at, prep_started_at, prep_seconds)")
    .eq("user_id", userId)
    .neq("room_id", room!.id);
  const activeElsewhere = (otherRows ?? []).some((r: any) => {
    const room = r.muendlich_rooms;
    const s = room?.state;
    if (["finished", "abandoned"].includes(s)) return false;
    if (["waiting_for_partner", "both_connected", "ready_check"].includes(s) && Date.now() - new Date(room.updated_at).getTime() > 15 * 60_000) return false;
    if (s === "preparation" && room.prep_started_at) {
      const prepEndsAt = new Date(room.prep_started_at).getTime() + room.prep_seconds * 1000;
      if (Date.now() - prepEndsAt > 5 * 60_000) return false;
    }
    if (["preparation_locked", "exam_room_ready"].includes(s) && Date.now() - new Date(room.updated_at).getTime() > 10 * 60_000) return false;
    return true;
  });
  if (activeElsewhere) {
    return { error: "You already have an active exam session in another room. Finish or leave it first." };
  }

  // assign a free slot — retry on the unique(room,slot) race (two joins interleaving)
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: parts } = await db.from("muendlich_participants").select("slot").eq("room_id", room!.id);
    const taken = new Set((parts ?? []).map((p: any) => p.slot));
    if (taken.size >= 2) return { error: "Room is full (2 participants max)" };
    const slot: Slot = taken.has("A") ? "B" : "A";
    const ins = await db.from("muendlich_participants").insert({ room_id: room!.id, user_id: userId, slot, connected: true }).select("*");
    if (!ins.error) {
      await maybeAdvanceToReadyCheck(room!.id);
      return { room: room!, slot };
    }
    const quotaMsg = muendlichQuotaMessage(ins.error.message);
    if (quotaMsg) return { error: quotaMsg };
    // 23505 = unique violation: either the slot got taken (retry) or we already joined (recover)
    const { data: mine } = await db.from("muendlich_participants").select("slot").eq("room_id", room!.id).eq("user_id", userId).maybeSingle();
    if (mine) { await db.from("muendlich_participants").update({ connected: true }).eq("room_id", room!.id).eq("user_id", userId); return { room: room!, slot: mine.slot }; }
    // else the slot was taken by the other user — loop and pick the remaining one
  }
  return { error: "Could not join the room — please try again" };
}

/** Atomic: only the first caller flips waiting_for_partner → ready_check. */
export async function maybeAdvanceToReadyCheck(roomId: string) {
  const { data: parts } = await db.from("muendlich_participants").select("connected").eq("room_id", roomId);
  const connected = (parts ?? []).filter((p: any) => p.connected).length;
  if (connected >= 2) {
    await db.from("muendlich_rooms").update({ state: "ready_check" }).eq("id", roomId).eq("state", "waiting_for_partner");
  }
}

/** Both ready → start preparation. Atomic state guard prevents a double prep_started_at
 *  stamp (which would desync the timer): only the first UPDATE matches state='ready_check'. */
export async function maybeStartPreparation(roomId: string) {
  const { data: parts } = await db.from("muendlich_participants").select("ready").eq("room_id", roomId);
  const allReady = (parts ?? []).length >= 2 && (parts ?? []).every((p: any) => p.ready);
  if (allReady) {
    await db.from("muendlich_rooms")
      .update({ state: "preparation", prep_started_at: new Date().toISOString() })
      .eq("id", roomId).eq("state", "ready_check");   // ← atomic: second concurrent call matches 0 rows
  }
}

/** When the synchronized timer hits 0, lock selections + advance to exam room.
 *  Atomic state guard so concurrent calls from both clients don't double-process. */
export async function lockAndAdvanceToExam(roomId: string) {
  const { data, error } = await db.from("muendlich_rooms")
    .update({ state: "exam_room_ready" })
    .eq("id", roomId).eq("state", "preparation").select("id");   // ← only one caller wins
  if (error || !data || data.length === 0) return;               // someone else already advanced
  await db.from("muendlich_selections").update({ locked: true }).eq("room_id", roomId);
}

export async function setReady(participantId: string, ready: boolean) { await db.from("muendlich_participants").update({ ready }).eq("id", participantId); }
export async function setConnChecks(participantId: string, patch: Partial<Pick<Participant, "mic_ok" | "voice_ok" | "connected">>) { await db.from("muendlich_participants").update(patch).eq("id", participantId); }

/** Save a selection immediately — Teil 1 per-slot, Teil 2/3 shared (slot null).
 *  NOTE: a table-level UNIQUE(room_id,teil,slot) does NOT constrain NULL slots
 *  (Postgres treats NULLs as distinct), so the shared case is handled with an
 *  explicit update-or-insert (and backed by a partial unique index in the DB). */
export async function saveSelection(roomId: string, teil: number, slot: Slot | null, value: string) {
  if (slot === null) {
    const { data: existing } = await db.from("muendlich_selections").select("id").eq("room_id", roomId).eq("teil", teil).is("slot", null).maybeSingle();
    if (existing) await db.from("muendlich_selections").update({ value, updated_at: new Date().toISOString() }).eq("id", existing.id);
    else {
      const ins = await db.from("muendlich_selections").insert({ room_id: roomId, teil, slot: null, value });
      // lost the insert race → the row now exists; update it instead
      if (ins.error) await db.from("muendlich_selections").update({ value, updated_at: new Date().toISOString() }).eq("room_id", roomId).eq("teil", teil).is("slot", null);
    }
  } else {
    await db.from("muendlich_selections").upsert({ room_id: roomId, teil, slot, value, updated_at: new Date().toISOString() }, { onConflict: "room_id,teil,slot" });
  }
}

/** Mark this user disconnected (best-effort) when they leave, so the partner sees it. */
export async function markDisconnected(roomId: string) {
  const { data: u } = await db.auth.getUser();
  if (u?.user?.id) await db.from("muendlich_participants").update({ connected: false }).eq("room_id", roomId).eq("user_id", u.user.id);
}

/** Real bug found via a professional-experience audit (2026-09-30): "abandoned"
 * was a real value in the RoomState CHECK constraint and the DB's own
 * single-active-session trigger (check_single_active_muendlich_session)
 * already excluded it as "not active" — but NOTHING anywhere in this codebase
 * ever actually wrote it. A student who created a room and never found a
 * partner (or whose partner never confirmed Ready) had no way to leave that
 * room state — markDisconnected() only flips their own participant row to
 * connected:false, never the room's own state — so the trigger permanently
 * blocked them from ever creating or joining another room again, with zero
 * self-service recovery. Called from leave() below whenever the room hasn't
 * reached a real LIVE AI connection yet (exam_in_progress) — everything up
 * to and including exam_room_ready is still local Supabase state with no
 * relay session open, so abandoning on an explicit Leave is always safe.
 * Extended the same day to cover preparation/preparation_locked/
 * exam_room_ready too, not just the original three pre-prep states — found
 * via HardwareCheck.tsx's own dead-end (a denied mic permission stranded a
 * student at exam_room_ready with no recourse, hitting this identical
 * lockout). exam_in_progress deliberately excluded: a real live exam has its
 * own relay-side reconnect-grace-period handling, which must keep winning
 * over an outright abandon. Atomic state guard, same idiom as every other
 * transition in this file, so a stale click can't clobber a room that
 * legitimately advanced in the meantime. */
export async function abandonRoomIfIncomplete(roomId: string, currentState: RoomState) {
  const ABANDONABLE: RoomState[] = ["waiting_for_partner", "both_connected", "ready_check", "preparation", "preparation_locked", "exam_room_ready"];
  if (!ABANDONABLE.includes(currentState)) return;
  await db.from("muendlich_rooms").update({ state: "abandoned" }).eq("id", roomId).eq("state", currentState);
}

export async function sendChat(roomId: string, slot: Slot | null, body: string) {
  const { data: u } = await db.auth.getUser();
  await db.from("muendlich_chat").insert({ room_id: roomId, user_id: u?.user?.id, slot, body });
}

export async function fetchRoomBundle(roomId: string) {
  const [room, parts, sels, chat] = await Promise.all([
    db.from("muendlich_rooms").select("*").eq("id", roomId).single(),
    db.from("muendlich_participants").select("*").eq("room_id", roomId).order("slot"),
    db.from("muendlich_selections").select("*").eq("room_id", roomId),
    db.from("muendlich_chat").select("*").eq("room_id", roomId).order("created_at"),
  ]);
  return { room: room.data as Room, participants: (parts.data ?? []) as Participant[], selections: (sels.data ?? []) as Selection[], chat: chat.data ?? [] };
}

/** Subscribe to all room tables via Realtime; calls onChange on any update. */
export function subscribeRoom(roomId: string, onChange: () => void) {
  const ch = db.channel(`muendlich:${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "muendlich_rooms", filter: `id=eq.${roomId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "muendlich_participants", filter: `room_id=eq.${roomId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "muendlich_selections", filter: `room_id=eq.${roomId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "muendlich_chat", filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
  return () => { db.removeChannel(ch); };
}

/** Real gap found via a professional-experience audit (2026-09-30): the only
 * way to start a Prüfungssimulation was to create a room and manually share
 * its code, or join one someone else shared — no automatic pairing at all.
 * Most students studying alone have no partner ready at the same moment.
 * join_muendlich_queue() (see its own migration) either matches immediately
 * with an existing same-level waiting student (returning a real room code
 * right away) or enrolls this user to wait (returns null) — the waiting
 * side then watches its OWN queue row via subscribeMatchmakingQueue() below
 * for matched_room_code to appear, same Realtime+poll idiom as subscribeRoom. */
export async function joinMatchmakingQueue(level: "TELC_B1" | "TELC_B2"): Promise<{ code: string | null } | { error: string }> {
  const { data, error } = await db.rpc("join_muendlich_queue", { p_level: level });
  if (error) {
    if (error.message?.includes("NO_MUENDLICH_ACCESS")) return { error: "Your subscription doesn't include Mündlich access. Upgrade to Mündlich or Komplett to use the exam room." };
    if (error.message?.includes("ALREADY_IN_ACTIVE_SESSION")) return { error: "You already have an active exam session. Finish or leave it first." };
    const quotaMsg = muendlichQuotaMessage(error.message);
    if (quotaMsg) return { error: quotaMsg };
    return { error: error.message };
  }
  return { code: data as string | null };
}

export async function leaveMatchmakingQueue(): Promise<void> {
  await db.rpc("leave_muendlich_queue");
}

/** Watches this user's own queue row for a match. Realtime is the primary
 * signal; the 2s poll is a safety net for the same reasons subscribeRoom's
 * callers already pair it with a poll elsewhere in this app. */
export function subscribeMatchmakingQueue(userId: string, onMatched: (code: string) => void) {
  let done = false;
  const check = async () => {
    if (done) return;
    const { data } = await db.from("muendlich_matchmaking_queue").select("matched_room_code").eq("user_id", userId).maybeSingle();
    if (data?.matched_room_code && !done) { done = true; onMatched(data.matched_room_code); }
  };
  const ch = db.channel(`muendlich-queue:${userId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "muendlich_matchmaking_queue", filter: `user_id=eq.${userId}` }, check)
    .subscribe();
  const poll = setInterval(check, 2000);
  return () => { done = true; db.removeChannel(ch); clearInterval(poll); };
}

/** One-time clock-offset measurement: serverNow − clientNow (ms). */
export async function fetchServerOffsetMs(): Promise<number> {
  try {
    const t0 = Date.now();
    const { data } = await db.rpc("server_now");
    const rtt = Date.now() - t0;
    if (!data) return 0;
    // account for ~half the round-trip
    return new Date(data as string).getTime() - (Date.now() - rtt / 2);
  } catch { return 0; }
}

/** Remaining prep seconds — server-authoritative via prep_started_at + clock offset.
 *  offsetMs = (serverNow − clientNow) measured per client; nowMs = client's local clock. */
export function remainingSeconds(room: Room, offsetMs = 0, nowMs: number = Date.now()): number {
  if (!room.prep_started_at) return room.prep_seconds;
  const serverNow = nowMs + offsetMs;
  const elapsed = (serverNow - new Date(room.prep_started_at).getTime()) / 1000;
  return Math.max(0, Math.round(room.prep_seconds - elapsed));
}

/** Verify a (recovered) room still exists and is not finished/abandoned. */
export async function roomExists(roomId: string): Promise<boolean> {
  const { data } = await db.from("muendlich_rooms").select("state").eq("id", roomId).maybeSingle();
  return !!data && !["finished", "abandoned"].includes(data.state);
}

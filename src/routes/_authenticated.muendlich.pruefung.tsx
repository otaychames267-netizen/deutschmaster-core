import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Users, Mic, MicOff, Wifi, Loader2, CheckCircle2, Copy, PhoneCall, Send, Clock, GraduationCap } from "lucide-react";
import { useVoiceCall } from "@/lib/muendlich/useVoiceCall";
import {
  joinOrCreateRoom, maybeStartPreparation, lockAndAdvanceToExam, setReady, setConnChecks,
  saveSelection, sendChat, fetchRoomBundle, subscribeRoom, remainingSeconds,
  fetchServerOffsetMs, roomExists, markDisconnected,
  type Room, type Participant, type Selection, type Slot,
} from "@/lib/muendlich/room";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/muendlich/pruefung")({
  component: PruefungPage,
});

const db = supabase as any;
const LS_KEY = "muendlich.room";

function PruefungPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [chat, setChat] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);

  const reload = useCallback(async (rid: string) => {
    const b = await fetchRoomBundle(rid);
    setRoom(b.room); setParticipants(b.participants); setSelections(b.selections); setChat(b.chat);
  }, []);

  // measure server clock offset once (synchronized timer)
  useEffect(() => { fetchServerOffsetMs().then(setOffsetMs); }, []);

  // session recovery — only restore if the room still exists & is active
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return;
    (async () => {
      try {
        const { roomId, slot } = JSON.parse(saved);
        if (await roomExists(roomId)) { setRoomId(roomId); setSlot(slot); }
        else localStorage.removeItem(LS_KEY);
      } catch { localStorage.removeItem(LS_KEY); }
    })();
  }, []);

  // subscribe (instant) + 2s poll (reliable real-time sync for chat/state/timer)
  useEffect(() => {
    if (!roomId) return;
    reload(roomId);
    const unsub = subscribeRoom(roomId, () => reload(roomId));
    const poll = setInterval(() => reload(roomId), 2000);
    return () => { unsub(); clearInterval(poll); };
  }, [roomId, reload]);

  async function start(code: string | null) {
    setBusy(true); setError(null);
    const r = await joinOrCreateRoom(code);
    setBusy(false);
    if ("error" in r) { setError(r.error); return; }
    setRoomId(r.room.id); setSlot(r.slot);
    localStorage.setItem(LS_KEY, JSON.stringify({ roomId: r.room.id, slot: r.slot }));
  }

  function leave() { if (roomId) markDisconnected(roomId); localStorage.removeItem(LS_KEY); setRoomId(null); setSlot(null); setRoom(null); }

  // ── Landing ──
  if (!roomId) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10"><Users className="h-7 w-7 text-rose-500" /></div>
        <h1 className="text-2xl font-black text-foreground">Prüfungssimulation</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">This simulation reproduces the complete TELC B2 speaking examination with two participants.</p>
        <div className="mx-auto mt-5 grid max-w-xs gap-2 text-left text-sm">
          {[["Two participants required", Users], ["Microphone required", Mic], ["Stable internet connection", Wifi]].map(([t, Icon]: any) => (
            <div key={t} className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4 text-rose-500" /> {t}</div>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        <button onClick={() => start(null)} disabled={busy} className="mx-auto mt-6 flex items-center gap-2 rounded-2xl bg-rose-500 px-8 py-3 text-base font-bold text-white hover:bg-rose-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneCall className="h-5 w-5" />} Start Prüfung
        </button>
        <div className="mt-6 flex items-center justify-center gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Join with Room ID" className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase" />
          <button onClick={() => start(joinCode.trim() || null)} disabled={busy || !joinCode.trim()} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">Join</button>
        </div>
      </div>
    );
  }

  // Recovering an existing room: roomId is set but the bundle hasn't loaded yet.
  // Show a loader (NOT the Landing page) so the user can't accidentally create a 2nd room.
  if (!room) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-rose-500" />
        <p className="text-sm text-muted-foreground">Reconnecting to your room…</p>
      </div>
    );
  }

  const me = participants.find((p) => p.slot === slot);
  const personA = participants.find((p) => p.slot === "A");
  const personB = participants.find((p) => p.slot === "B");

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <RoomHeader room={room} slot={slot!} onLeave={leave} />
      {room.state === "waiting_for_partner" && <Waiting code={room.code} />}
      {room.state === "ready_check" && <ReadyCheck roomId={roomId} me={me} personA={personA} personB={personB} />}
      {room.state === "preparation" && <PrepRoom room={room} slot={slot!} me={me} participants={participants} selections={selections} chat={chat} offsetMs={offsetMs} onRefresh={() => reload(roomId)} />}
      {(room.state === "preparation_locked" || room.state === "exam_room_ready" || room.state === "exam_in_progress") && <ExamRoom room={room} participants={participants} selections={selections} chat={chat} slot={slot!} />}
    </div>
  );
}

function RoomHeader({ room, slot, onLeave }: { room: Room; slot: Slot; onLeave: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-3 text-sm">
        <span className="rounded-lg bg-rose-500/10 px-2 py-1 font-mono font-bold text-rose-500">Room {room.code}</span>
        <span className="text-muted-foreground">You are <strong className="text-foreground">Person {slot}</strong></span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{room.state}</span>
      </div>
      <button onClick={onLeave} className="text-xs text-muted-foreground hover:text-rose-500">Leave</button>
    </div>
  );
}

function Waiting({ code }: { code: string }) {
  return (
    <div className="py-16 text-center">
      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-rose-500" />
      <p className="font-bold text-foreground">Waiting for second participant…</p>
      <p className="mt-2 text-sm text-muted-foreground">Share this Room ID with your partner:</p>
      <button aria-label="Copy Room ID" onClick={() => navigator.clipboard?.writeText(code)} className="mx-auto mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-mono text-lg font-black text-rose-500 hover:bg-muted">
        {code} <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

function statusRow(p?: Participant) {
  return (
    <div className="grid grid-cols-2 gap-1.5 text-sm">
      {[["Connected", p?.connected], ["Ready", p?.ready], ["Microphone", p?.mic_ok], ["Voice", p?.voice_ok]].map(([l, ok]: any) => (
        <div key={l} className="flex items-center gap-1.5"><CheckCircle2 className={`h-4 w-4 ${ok ? "text-emerald-500" : "text-muted-foreground/30"}`} /> <span className={ok ? "text-foreground" : "text-muted-foreground"}>{l}</span></div>
      ))}
    </div>
  );
}

function ReadyCheck({ roomId, me, personA, personB }: { roomId: string; me?: Participant; personA?: Participant; personB?: Participant }) {
  const [checking, setChecking] = useState(false);
  async function checkMic() {
    if (!me) return;
    setChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await setConnChecks(me.id, { mic_ok: true, voice_ok: true });
    } catch { await setConnChecks(me.id, { mic_ok: false }); }
    setChecking(false);
  }
  async function ready() { if (me) { await setReady(me.id, !me.ready); await maybeStartPreparation(roomId); } }
  useEffect(() => { if (me && !me.mic_ok) checkMic(); /* auto mic check */ }, [me?.id]);

  return (
    <div>
      <h2 className="mb-1 text-lg font-black text-foreground">Connection &amp; Readiness Check</h2>
      <p className="mb-4 text-sm text-muted-foreground">Both participants must be Ready before the 15-minute preparation begins.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[["Person A", personA], ["Person B", personB]].map(([label, p]: any) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 font-bold text-foreground">{label}</p>
            {statusRow(p)}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={checkMic} disabled={checking} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">{checking ? "Checking mic…" : "Re-check microphone"}</button>
        <button onClick={ready} className={`rounded-lg px-5 py-2 text-sm font-bold text-white ${me?.ready ? "bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>{me?.ready ? "Ready ✓ (tap to undo)" : "Ready"}</button>
      </div>
    </div>
  );
}

function PrepRoom({ room, slot, me, participants, selections, chat, offsetMs, onRefresh }: { room: Room; slot: Slot; me?: Participant; participants: Participant[]; selections: Selection[]; chat: any[]; offsetMs: number; onRefresh: () => void }) {
  const [remaining, setRemaining] = useState(remainingSeconds(room, offsetMs));
  const [materials, setMaterials] = useState<Record<number, { title: string }[]>>({});
  const [draft, setDraft] = useState("");
  const fired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const r = remainingSeconds(room, offsetMs);
      setRemaining(r);
      // At 00:00, one client locks + advances. Reset the guard on failure so a
      // transient error retries on the next tick instead of stalling the room.
      if (r <= 0 && !fired.current) {
        fired.current = true;
        lockAndAdvanceToExam(room.id).then(onRefresh).catch(() => { fired.current = false; });
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [room.id, room.prep_started_at, offsetMs]);

  useEffect(() => {
    (async () => {
      const out: Record<number, { title: string }[]> = {};
      for (const teil of [1, 2, 3]) {
        const { data } = await db.from("muendlich_materials").select("title").eq("teil", teil).eq("category", "themen").order("sort_order");
        out[teil] = data ?? [];
      }
      setMaterials(out);
    })();
  }, []);

  const mm = Math.floor(remaining / 60), ss = remaining % 60;
  const sel = (teil: number, s: Slot | null) => selections.find((x) => x.teil === teil && (s === null ? x.slot === null : x.slot === s))?.value;

  async function pick(teil: number, perSlot: boolean, value: string) {
    await saveSelection(room.id, teil, perSlot ? slot : null, value);
    onRefresh();
  }
  async function send() { if (draft.trim()) { await sendChat(room.id, slot, draft.trim()); setDraft(""); onRefresh(); } }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {/* timer */}
        <div className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2"><Clock className="h-5 w-5 text-rose-500" /><span className="font-bold text-foreground">Preparation</span></div>
          <span className="font-mono text-3xl font-black text-rose-500">{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>
        </div>

        {/* Teil 1 — per-person */}
        <SelBlock title="Teil 1 — choose your theme (each participant independently)" options={materials[1] ?? []} selected={sel(1, slot)} onPick={(v) => pick(1, true, v)} />
        {/* Teil 2 — shared */}
        <SelBlock title="Teil 2 — choose ONE common discussion topic" options={materials[2] ?? []} selected={sel(2, null)} onPick={(v) => pick(2, false, v)} shared />
        {/* Teil 3 — shared */}
        <SelBlock title="Teil 3 — choose ONE common planning topic" options={materials[3] ?? []} selected={sel(3, null)} onPick={(v) => pick(3, false, v)} shared />
        <p className="text-xs text-muted-foreground">Write your notes on paper, as in the real exam. Selections save automatically and lock when the timer reaches 00:00.</p>
      </div>

      {/* right column: participants + voice + chat */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-bold text-foreground">Participants</p>
          {participants.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1 text-sm">
              <span>Person {p.slot}{p.slot === slot ? " (you)" : ""}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">{p.voice_ok ? <Mic className="h-3.5 w-3.5 text-emerald-500" /> : <Mic className="h-3.5 w-3.5 text-muted-foreground/40" />}{p.connected ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <Wifi className="h-3.5 w-3.5 text-rose-500" />}</span>
            </div>
          ))}
          <VoiceCall roomId={room.id} slot={slot} me={me} />
        </div>
        <ChatBox chat={chat} draft={draft} setDraft={setDraft} send={send} slot={slot} />
      </div>
    </div>
  );
}

function VoiceCall({ roomId, slot, me }: { roomId: string; slot: Slot; me?: Participant }) {
  const { connected, micOn, toggleMic, error } = useVoiceCall(roomId, slot, true);
  useEffect(() => { if (connected && me && !me.voice_ok) setConnChecks(me.id, { voice_ok: true }); }, [connected, me?.id]);
  return (
    <div className={`mt-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${connected ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
      <span className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> {error ? "Voice error" : connected ? "Voice call active" : "Connecting voice…"}</span>
      <button aria-label={micOn ? "Mute microphone" : "Unmute microphone"} onClick={toggleMic} className="rounded p-1 hover:bg-black/5" title={micOn ? "Mute" : "Unmute"}>{micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}</button>
    </div>
  );
}

function SelBlock({ title, options, selected, onPick, shared }: { title: string; options: { title: string }[]; selected?: string; onPick: (v: string) => void; shared?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 text-sm font-bold text-foreground">{title}{shared && <span className="ml-2 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-500">shared</span>}</p>
      {options.length === 0 ? <p className="text-xs text-muted-foreground">No themes uploaded yet (admin adds them under Themen).</p> : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button key={o.title} onClick={() => onPick(o.title)} className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${selected === o.title ? "border-rose-500 bg-rose-500/10 text-rose-600 font-semibold" : "border-border hover:bg-muted"}`}>{o.title}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatBox({ chat, draft, setDraft, send, slot }: { chat: any[]; draft: string; setDraft: (s: string) => void; send: () => void; slot: Slot }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [chat.length]);
  return (
    <div className="flex h-72 flex-col rounded-2xl border border-border bg-card">
      <p className="border-b border-border px-3 py-2 text-sm font-bold text-foreground">Chat</p>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3 text-sm">
        {chat.map((c) => (<div key={c.id}><span className={`font-bold ${c.slot === slot ? "text-rose-500" : "text-foreground"}`}>{c.slot ?? "?"}:</span> <span className="text-muted-foreground">{c.body}</span></div>))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-1.5 border-t border-border p-2">
        <input aria-label="Chat message" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message…" className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
        <button aria-label="Send message" onClick={send} className="rounded-lg bg-rose-500 p-2 text-white hover:bg-rose-600"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function ExamRoom({ room, participants, selections, chat, slot }: { room: Room; participants: Participant[]; selections: Selection[]; chat: any[]; slot: Slot }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
        <GraduationCap className="mx-auto mb-2 h-7 w-7 text-amber-500" />
        <p className="font-black text-foreground">Exam Room</p>
        <p className="text-sm text-muted-foreground">Preparation complete — selections are locked. The AI examiner connects here in Phase 2.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Examiner", "AI — Phase 2"], ["Person A", participants.find((p) => p.slot === "A") ? "connected" : "—"], ["Person B", participants.find((p) => p.slot === "B") ? "connected" : "—"]].map(([r, s]) => (
          <div key={r} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="font-bold text-foreground">{r}</p><p className="text-xs text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="mb-2 font-bold text-foreground">Locked selections</p>
          {selections.map((s, i) => <div key={i} className="text-muted-foreground">Teil {s.teil}{s.slot ? ` (Person ${s.slot})` : ""}: <span className="text-foreground">{s.value}</span></div>)}
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-bold text-foreground">Placeholders (Phase 2)</p>
          Current Stage · Current Speaker · Microphone Indicator · Connection Indicator · Voice Status · Chat · Timer · AI Examiner
        </div>
      </div>
    </div>
  );
}

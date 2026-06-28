/**
 * useVoiceCall — WebRTC peer-to-peer voice between the two room participants.
 *
 * Signaling over a Supabase Realtime broadcast channel (`voice:<roomId>`).
 * Robust discovery via hello/hello_ack so it connects regardless of join order;
 * slot A (impolite) makes the offer, slot B (polite) answers. Audio-only.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * ICE servers: STUN (fast, works on most networks) + TURN (relays media when
 * direct/STUN paths fail — required for restrictive/symmetric-NAT networks).
 *
 * TURN credentials come from env (set these in production for your own TURN):
 *   VITE_TURN_URLS       — comma-separated turn:/turns: URLs
 *   VITE_TURN_USERNAME   — TURN username
 *   VITE_TURN_CREDENTIAL — TURN credential/password
 * If unset, we fall back to the OpenRelay public TURN project so voice still
 * works out-of-the-box on hard networks. STUN always stays as the primary path.
 */
const STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

function buildTurn(): RTCIceServer[] {
  const env = (import.meta as any).env ?? {};
  const urls = (env.VITE_TURN_URLS as string | undefined)?.split(",").map((s) => s.trim()).filter(Boolean);
  if (urls && urls.length && env.VITE_TURN_USERNAME && env.VITE_TURN_CREDENTIAL) {
    return [{ urls, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL }];
  }
  // Fallback: OpenRelay public TURN (open credentials). UDP, TCP, and TLS/443
  // so it traverses firewalls that only allow outbound HTTPS.
  return [
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turns:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ];
}

const ICE: RTCIceServer[] = [...STUN, ...buildTurn()];

export function useVoiceCall(roomId: string | null, slot: "A" | "B" | null, enabled: boolean) {
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!roomId || !slot || !enabled) return;
    let cancelled = false;
    const polite = slot === "B";
    let subscribed = false, peerPresent = false, offerMade = false;

    // remote audio element must live in the DOM to play
    const audio = document.createElement("audio");
    audio.autoplay = true; (audio as any).playsInline = true;
    audio.style.display = "none";
    document.body.appendChild(audio);

    const ch = (supabase as any).channel(`voice:${roomId}`, { config: { broadcast: { self: false } } });
    const send = (payload: any) => ch.send({ type: "broadcast", event: "signal", payload: { from: slot, ...payload } });

    async function negotiate(pc: RTCPeerConnection) {
      if (polite || offerMade || !subscribed || !peerPresent) return;
      offerMade = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ description: pc.localDescription });
    }

    (async () => {
      try {
        const local = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { local.getTracks().forEach((t) => t.stop()); return; }
        localRef.current = local;

        const pc = new RTCPeerConnection({ iceServers: ICE, iceCandidatePoolSize: 4 });
        pcRef.current = pc;
        local.getTracks().forEach((t) => pc.addTrack(t, local));
        pc.ontrack = (e) => { audio.srcObject = e.streams[0]; audio.play().catch(() => {}); };
        pc.onicecandidate = (e) => { if (e.candidate) send({ candidate: e.candidate }); };
        pc.onconnectionstatechange = () => { if (!cancelled) setConnected(pc.connectionState === "connected"); };
        // If ICE fails (NAT/firewall), the impolite peer restarts negotiation — TURN relay picks it up.
        pc.oniceconnectionstatechange = () => {
          if (!cancelled && pc.iceConnectionState === "failed" && !polite) {
            try { (pc as any).restartIce?.(); offerMade = false; negotiate(pc); } catch { /* */ }
          }
        };

        ch.on("broadcast", { event: "signal" }, async ({ payload }: any) => {
          if (!payload || payload.from === slot) return;
          try {
            // A fresh `hello` means the peer (re)appeared — e.g. after a refresh. Reset
            // offerMade so the impolite side re-offers and voice reconnects automatically.
            if (payload.hello) { peerPresent = true; offerMade = false; send({ hello_ack: true }); await negotiate(pc); }
            else if (payload.hello_ack) { peerPresent = true; await negotiate(pc); }
            else if (payload.description) {
              const desc = payload.description;
              const collision = desc.type === "offer" && (pc.signalingState !== "stable");
              if (collision && !polite) return;            // impolite ignores colliding offer
              if (collision && polite) await Promise.all([pc.setLocalDescription({ type: "rollback" } as any).catch(() => {})]);
              await pc.setRemoteDescription(desc);
              if (desc.type === "offer") { const ans = await pc.createAnswer(); await pc.setLocalDescription(ans); send({ description: pc.localDescription }); }
            } else if (payload.candidate) {
              try { await pc.addIceCandidate(payload.candidate); } catch { /* */ }
            }
          } catch (e: any) { setError(String(e?.message ?? e).slice(0, 80)); }
        });

        ch.subscribe((status: string) => { if (status === "SUBSCRIBED") { subscribed = true; send({ hello: true }); } });
      } catch (e: any) { if (!cancelled) setError(e?.message ?? "Microphone/voice unavailable"); }
    })();

    return () => {
      cancelled = true;
      localRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      (supabase as any).removeChannel(ch);
      audio.srcObject = null; audio.remove();
    };
  }, [roomId, slot, enabled]);

  function toggleMic() {
    const next = !micOn;
    (localRef.current?.getAudioTracks() ?? []).forEach((t) => (t.enabled = next));
    setMicOn(next);
  }

  return { connected, micOn, toggleMic, error };
}

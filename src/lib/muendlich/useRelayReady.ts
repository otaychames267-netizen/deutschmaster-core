import { useEffect, useState } from "react";

/**
 * Is the AI exam server able to run an exam RIGHT NOW? (relay GET /health/ready — owner 2026-10-11.) The relay's watchdog knows when the voice credit is
 * gone with no backup, the AI key is dead, etc.; asking before the student starts lets us show a clear message instead of an examiner who stays silent.
 * Fail-open: if the relay does not answer (or answers "unknown"), the student is NOT blocked — a dead relay ends the attempt within seconds anyway, and
 * attempts under 90 s never count against the daily/monthly allowance.
 */
const RELAY_URL: string | undefined = (import.meta as any).env?.VITE_MUENDLICH_RELAY_URL;

export interface RelayReadyResult { ready: boolean; reason: string | null }

export function relayHttpUrl(): string | null {
  if (!RELAY_URL) return null;
  return RELAY_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");
}

export async function checkRelayReady(timeoutMs = 4000): Promise<RelayReadyResult> {
  const base = relayHttpUrl();
  if (!base) return { ready: true, reason: null };
  try {
    const res = await fetch(`${base}/health/ready`, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ready: true, reason: null };
    const j = (await res.json()) as { ready?: boolean; reason?: string | null };
    return j.ready === false ? { ready: false, reason: j.reason ?? null } : { ready: true, reason: null };
  } catch {
    return { ready: true, reason: null };
  }
}

/** Polls the relay's readiness while the page is open. status "checking" until the first answer. */
export function useRelayReady(everyMs = 60_000): { status: "checking" | "ready" | "down"; reason: string | null } {
  const [state, setState] = useState<{ status: "checking" | "ready" | "down"; reason: string | null }>({ status: "checking", reason: null });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const r = await checkRelayReady();
      if (alive) setState({ status: r.ready ? "ready" : "down", reason: r.reason });
    };
    void run();
    const t = setInterval(run, everyMs);
    return () => { alive = false; clearInterval(t); };
  }, [everyMs]);
  return state;
}

export const SERVICE_DOWN_DE = "Der KI-Sprachtrainer ist gerade vorübergehend nicht verfügbar. Wir arbeiten daran — dein Kontingent wird nicht belastet. Bitte versuche es in einigen Minuten erneut.";
export const SERVICE_DOWN_AR = "مدرّب المحادثة بالذكاء الاصطناعي متوقف مؤقتاً. نشتغلو على الإصلاح، ولن يُحتسب عليك أي تمرين. جرّب بعد دقائق.";

import { supabase } from "@/integrations/supabase/client";

const FP_KEY = "dm_device_fp";

function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "Unknown OS";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return `${browser} on ${os}`;
}

async function getIP(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    return j.ip ?? null;
  } catch {
    return null;
  }
}

/** Record a successful (or failed) login + upsert the trusted-device row. */
export async function recordLoginSuccess(userId: string, success = true) {
  const fingerprint = getOrCreateFingerprint();
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  const ip = await getIP();

  // Insert login history
  await supabase.from("login_history").insert({
    user_id: userId,
    ip_address: ip,
    user_agent: userAgent,
    device_fingerprint: fingerprint,
    success,
  });

  if (!success) return;

  // Upsert device row (manual: try update first, then insert if no match)
  const { data: existing } = await supabase
    .from("devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
    .maybeSingle();

  if (existing) {
    await supabase.from("devices").update({ last_seen: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("devices").insert({
      user_id: userId,
      device_fingerprint: fingerprint,
      device_name: getDeviceName(),
      trusted: false,
    });
  }
}

/** Expire any overdue trials/subscriptions for this user. Safe to call on every session start. */
export async function expireOverdueSubscriptions() {
  await supabase.rpc("expire_overdue_subscriptions");
}
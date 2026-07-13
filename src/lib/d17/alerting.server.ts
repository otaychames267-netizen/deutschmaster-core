import { notifyTelegram } from "@/lib/notify/telegram.server";
import { sendEmail } from "@/lib/notify/email.server";

const HIGH_RISK_CLUSTER_THRESHOLD = 5;
const HIGH_RISK_CLUSTER_WINDOW_MS = 3600_000;
const BUDGET_ALERT_FRACTION = 0.8;
const MULTI_ACCOUNT_DEDUPE_WINDOW_MS = 24 * 3600_000;
// Device fingerprints are a stronger signal (3+ distinct accounts on one
// device is unusual) than IP addresses (NAT/shared wifi/CGNAT routinely put
// many unrelated people behind one IP, so the bar is set higher).
const MULTI_ACCOUNT_DEVICE_THRESHOLD = 3;
const MULTI_ACCOUNT_IP_THRESHOLD = 5;

async function raiseAlert(
  supabaseAdmin: any,
  params: { severity: "warning" | "critical"; category: string; message: string; metadata?: Record<string, unknown> },
) {
  const telegramSent = await notifyTelegram(`[${params.severity.toUpperCase()}] ${params.category}: ${params.message}`);

  let emailSent = false;
  const alertEmail = process.env.ADMIN_ALERT_EMAIL;
  if (alertEmail) {
    await sendEmail({
      to: alertEmail,
      subject: `AuraLingovia D17 alert — ${params.category}`,
      html: `<p><strong>${params.severity.toUpperCase()}</strong>: ${params.message}</p>`,
    });
    emailSent = true;
  }

  await supabaseAdmin.from("d17_alerts").insert({
    severity: params.severity,
    category: params.category,
    message: params.message,
    metadata: params.metadata ?? {},
    telegram_sent: telegramSent,
    email_sent: emailSent,
  });
}

/** Called from verify.functions.ts's catch block when a Gemini call fails. */
export async function alertGeminiFailure(supabaseAdmin: any, error: unknown) {
  await raiseAlert(supabaseAdmin, {
    severity: "critical",
    category: "gemini_failure",
    message: `Gemini verification call failed: ${String(error).slice(0, 300)}`,
  });
}

/**
 * 5+ auto-rejected decisions within the last hour — could indicate an
 * attack or an OCR/prompt malfunction. Dedupes against the last hour so a
 * sustained burst doesn't spam an alert on every single rejection.
 */
export async function checkHighRiskCluster(supabaseAdmin: any) {
  const since = new Date(Date.now() - HIGH_RISK_CLUSTER_WINDOW_MS).toISOString();
  const { count } = await supabaseAdmin
    .from("d17_verification_attempts")
    .select("id", { count: "exact", head: true })
    .in("decision", ["auto_rejected_duplicate", "auto_rejected_fraud"])
    .gte("created_at", since);
  if ((count ?? 0) < HIGH_RISK_CLUSTER_THRESHOLD) return;

  const { count: recentAlertCount } = await supabaseAdmin
    .from("d17_alerts")
    .select("id", { count: "exact", head: true })
    .eq("category", "high_risk_cluster")
    .gte("created_at", since);
  if ((recentAlertCount ?? 0) > 0) return;

  await raiseAlert(supabaseAdmin, {
    severity: "warning",
    category: "high_risk_cluster",
    message: `${count} payment verification attempts auto-rejected in the last hour.`,
    metadata: { count },
  });
}

/** Called from verify.functions.ts only on the 2nd/3rd escalation tier — a
 * single confirmed duplicate is common/low-signal (an accidental
 * double-submit), not worth paging anyone. */
export async function alertFraudSuspensionEscalated(
  supabaseAdmin: any,
  params: { userId: string; tier: 2 | 3; confirmedDuplicateCount: number },
) {
  await raiseAlert(supabaseAdmin, {
    severity: params.tier === 3 ? "critical" : "warning",
    category: "fraud_suspension_escalated",
    message:
      params.tier === 3
        ? `User ${params.userId} account LOCKED after ${params.confirmedDuplicateCount} confirmed duplicate payment submissions.`
        : `User ${params.userId} suspended for 24 hours after ${params.confirmedDuplicateCount} confirmed duplicate payment submissions.`,
    metadata: { userId: params.userId, tier: params.tier, confirmedDuplicateCount: params.confirmedDuplicateCount },
  });
}

/** Raises (and dedupes) a single multi-account-abuse alert for one key
 * (a device fingerprint or an IP address). Deduped per key for 24h via
 * metadata containment so a sustained abusive cluster doesn't re-page on
 * every subsequent attempt — same dedupe shape as checkHighRiskCluster,
 * just keyed per-device/IP instead of globally. */
async function alertMultiAccountAbuse(
  supabaseAdmin: any,
  params: { keyType: "device" | "ip"; key: string; accountCount: number },
) {
  const since = new Date(Date.now() - MULTI_ACCOUNT_DEDUPE_WINDOW_MS).toISOString();
  const { count: recentAlertCount } = await supabaseAdmin
    .from("d17_alerts")
    .select("id", { count: "exact", head: true })
    .eq("category", "multi_account_abuse")
    .gte("created_at", since)
    .contains("metadata", { keyType: params.keyType, key: params.key });
  if ((recentAlertCount ?? 0) > 0) return;

  await raiseAlert(supabaseAdmin, {
    severity: "warning",
    category: "multi_account_abuse",
    message:
      params.keyType === "device"
        ? `${params.accountCount} distinct accounts have submitted D17 payments from the same device fingerprint.`
        : `${params.accountCount} distinct accounts have submitted D17 payments from the same IP address.`,
    metadata: { keyType: params.keyType, key: params.key, accountCount: params.accountCount },
  });
}

/** Called from verify.functions.ts right after computeReputationVelocity —
 * self-contained threshold check + dedupe + alert, mirroring
 * checkHighRiskCluster's shape. sharedDeviceAccountCount/sharedIpAccountCount
 * already count DISTINCT OTHER accounts, so crossing the threshold means
 * (threshold + 1) total accounts including this one are clustered together. */
export async function checkMultiAccountAbuse(
  supabaseAdmin: any,
  params: { deviceFingerprint: string | null; ipAddress: string | null; sharedDeviceAccountCount: number; sharedIpAccountCount: number },
) {
  if (params.deviceFingerprint && params.sharedDeviceAccountCount >= MULTI_ACCOUNT_DEVICE_THRESHOLD) {
    await alertMultiAccountAbuse(supabaseAdmin, {
      keyType: "device",
      key: params.deviceFingerprint,
      accountCount: params.sharedDeviceAccountCount + 1,
    });
  }
  if (params.ipAddress && params.sharedIpAccountCount >= MULTI_ACCOUNT_IP_THRESHOLD) {
    await alertMultiAccountAbuse(supabaseAdmin, {
      keyType: "ip",
      key: params.ipAddress,
      accountCount: params.sharedIpAccountCount + 1,
    });
  }
}

/** Fires once per UTC day when usage crosses 80% of GEMINI_DAILY_TOKEN_CAP. */
export async function checkBudget80Percent(supabaseAdmin: any) {
  const cap = Number(process.env.GEMINI_DAILY_TOKEN_CAP ?? Infinity);
  if (!Number.isFinite(cap)) return;

  const { data: usage } = await supabaseAdmin.rpc("get_today_api_usage");
  if (typeof usage !== "number" || usage < cap * BUDGET_ALERT_FRACTION) return;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: alreadyAlertedToday } = await supabaseAdmin
    .from("d17_alerts")
    .select("id", { count: "exact", head: true })
    .eq("category", "budget_80pct")
    .gte("created_at", todayStart.toISOString());
  if ((alreadyAlertedToday ?? 0) > 0) return;

  await raiseAlert(supabaseAdmin, {
    severity: "warning",
    category: "budget_80pct",
    message: `Gemini daily usage at ${usage}/${cap} tokens (${Math.round((usage / cap) * 100)}%).`,
    metadata: { usage, cap },
  });
}

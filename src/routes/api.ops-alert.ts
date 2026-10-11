import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/ops-alert — the relay's operations watchdog (muendlich-relay/src/opsWatch.ts) reports here when a provider is about to run dry or has
 * failed (DeepInfra / ElevenLabs / Anthropic / Groq balance, TTS failover engaged, ...) and once a day with a digest. The relay decides WHEN to alert;
 * this route only delivers, through the channels the project already has (Telegram if TELEGRAM_BOT_TOKEN/CHAT_ID are set, email via Resend to
 * ADMIN_ALERT_EMAIL if set) and always writes the ops_alerts row. Authenticated by the shared secret OPS_ALERT_SECRET in header x-ops-secret.
 */
const SEVERITIES = ["info", "warning", "critical"] as const;
const DEDUPE_WINDOW_MS = 10 * 60_000;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const Route = createFileRoute("/api/ops-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.OPS_ALERT_SECRET;
        if (!expected) return Response.json({ error: "not configured" }, { status: 503 });
        const given = request.headers.get("x-ops-secret") ?? "";
        const { timingSafeEqual } = await import("node:crypto");
        const a = Buffer.from(given), b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "unauthorized" }, { status: 401 });

        let body: { severity?: string; key?: string; title?: string; message?: string; details?: unknown };
        try { body = await request.json(); } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }
        const severity = SEVERITIES.find((s) => s === body.severity);
        const key = String(body.key ?? "").slice(0, 64);
        const title = String(body.title ?? "").slice(0, 200);
        const message = String(body.message ?? "").slice(0, 2000);
        if (!severity || !key || !title) return Response.json({ error: "severity, key and title are required" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        // The relay already de-duplicates; this only guards against the same alert arriving twice in a few minutes (retry, restart).
        const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
        const { data: recent } = await db.from("ops_alerts").select("id").eq("key", key).eq("severity", severity).eq("title", title).gte("created_at", since).limit(1);
        if (recent && recent.length > 0) return Response.json({ deduped: true });

        const { notifyTelegram } = await import("@/lib/notify/telegram.server");
        const { sendEmail } = await import("@/lib/notify/email.server");
        const icon = severity === "critical" ? "🔴" : severity === "warning" ? "🟠" : "ℹ️";
        const telegramSent = await notifyTelegram(`${icon} [${severity.toUpperCase()}] ${title}\n${message}`);
        let emailSent = false;
        const to = process.env.ADMIN_ALERT_EMAIL;
        if (to) {
          const r = await sendEmail({
            to,
            subject: `[AuraLingovia ${severity}] ${title}`,
            html: `<p><strong>${escapeHtml(title)}</strong></p><pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(message)}</pre>`,
          });
          emailSent = r.ok;
        }

        const { error } = await db.from("ops_alerts").insert({ severity, key, title, message, details: body.details ?? {}, telegram_sent: telegramSent, email_sent: emailSent });
        if (error) console.error("[ops-alert] could not write the ops_alerts row:", error.message);
        return Response.json({ ok: true, telegram: telegramSent, email: emailSent });
      },
    },
  },
});

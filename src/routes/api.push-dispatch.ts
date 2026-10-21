import { createFileRoute } from "@tanstack/react-router";
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/lib/push-config";
import { pushSummary } from "@/lib/push-summary";

/**
 * POST /api/push-dispatch — delivers pending notifications as Web Push messages.
 *
 * Woken by the database (pg_net, public.push_kick(): every 5 minutes when something is waiting, and right after the
 * content notifier / an admin broadcast). The database decides WHAT is due (claim_push_batch: unread grouped/broadcast
 * notifications from the last 24 h, only to devices subscribed before the notification, nothing between 22:00 and 08:00
 * Tunis time) and marks them claimed before this route sends, so a retry can never double-send. This route only signs
 * and sends, then reports which devices accepted / are gone, so dead subscriptions are pruned.
 *
 * Authenticated by the shared secret PUSH_DISPATCH_SECRET (header x-push-secret; the same value sits in Supabase Vault).
 * Needs VAPID_PRIVATE_KEY; the public key and the contact URL are constants in src/lib/push-config.ts.
 */
const BUDGET_MS = 20_000;   // stop claiming new batches after this; the next 5-minute tick continues
const BATCH = 200;          // notifications per claim
const CONCURRENCY = 20;     // parallel pushes
const SEND_TIMEOUT_MS = 8_000;

interface Sub { id: string; endpoint: string; p256dh: string; auth: string }
interface Item { id: string; title: string; body: string; type: string; url: string | null; tag: string; subs: Sub[] }

export const Route = createFileRoute("/api/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.PUSH_DISPATCH_SECRET;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        if (!expected || !privateKey) return Response.json({ error: "not configured" }, { status: 503 });
        const given = request.headers.get("x-push-secret") ?? "";
        const { timingSafeEqual } = await import("node:crypto");
        const a = Buffer.from(given), b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "unauthorized" }, { status: 401 });

        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const started = Date.now();
        const totals = { notifications: 0, sent: 0, gone: 0, failed: 0 };

        while (Date.now() - started < BUDGET_MS) {
          const { data, error } = await db.rpc("claim_push_batch", { p_limit: BATCH });
          if (error) { console.error("[push-dispatch] claim failed:", error.message); break; }
          const items = (data ?? []) as Item[];
          if (items.length === 0) break;
          totals.notifications += items.length;

          const jobs = items.flatMap((n) => n.subs.map((s) => ({ n, s })));
          const ok: string[] = [], gone: string[] = [], failed: string[] = [];
          let next = 0;
          const worker = async () => {
            while (next < jobs.length) {
              const { n, s } = jobs[next++];
              const path = n.url && n.url.startsWith("/") && !n.url.startsWith("//") ? n.url : "/";
              const alert = n.type === "alert";
              try {
                await webpush.sendNotification(
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  // a lock-screen sized text, not the whole message (the card in the app has that)
                  JSON.stringify({ t: alert ? `⚠️ ${n.title}` : n.title, b: pushSummary(n.body, alert), u: path, g: n.tag, a: alert ? 1 : 0 }),
                  { TTL: (alert ? 24 : 6) * 3600, urgency: alert ? "high" : "normal", timeout: SEND_TIMEOUT_MS },
                );
                ok.push(s.id);
              } catch (e) {
                const code = (e as { statusCode?: number }).statusCode;
                if (code === 404 || code === 410) gone.push(s.id);
                else { failed.push(s.id); console.warn("[push-dispatch] send failed:", code ?? (e as Error).message); }
              }
            }
          };
          await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

          const { error: recErr } = await db.rpc("record_push_results", { p_ok: ok, p_gone: gone, p_failed: failed });
          if (recErr) console.error("[push-dispatch] could not record results:", recErr.message);
          totals.sent += ok.length; totals.gone += gone.length; totals.failed += failed.length;
          if (items.length < BATCH) break;
        }
        return Response.json({ ok: true, ...totals, ms: Date.now() - started });
      },
    },
  },
});

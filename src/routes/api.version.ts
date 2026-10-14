import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/version — the id of the deployment that answers this request (Vercel's commit sha, "" locally). The page compares it with the id it was built with
 * (src/lib/version-watch.ts) to notice "a new version was released while this tab was open". Public, no data, never cached.
 */
export const Route = createFileRoute("/api/version")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({ id: process.env.VERCEL_GIT_COMMIT_SHA ?? "" }, { headers: { "Cache-Control": "no-store, max-age=0" } }),
    },
  },
});

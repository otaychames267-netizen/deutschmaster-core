import { useParams } from "@tanstack/react-router";

export type ActiveLevel = "TELC_B1" | "TELC_B2";

/** Reads the `$level` route param from the nearest matched `/_authenticated/$level/*`
 * ancestor route (works from any depth without prop drilling). Returns null outside
 * a level-scoped route tree. This — not `useAuth().level` — is the single source of
 * truth for which level's content to query; it is locked to the URL, not a mutable
 * profile preference, so B1/B2 content can never cross-contaminate mid-session. */
export function useActiveLevel(): ActiveLevel | null {
  const params = useParams({ strict: false }) as { level?: string };
  if (params.level === "b1") return "TELC_B1";
  if (params.level === "b2") return "TELC_B2";
  return null;
}

/** Raw "b1" | "b2" URL segment (undefined outside a level-scoped route). Used to
 * build level-prefixed link targets, e.g. `to={`/${seg}/schriftlich`}`. */
export function useLevelSegment(): "b1" | "b2" | undefined {
  const params = useParams({ strict: false }) as { level?: string };
  return params.level === "b1" || params.level === "b2" ? params.level : undefined;
}

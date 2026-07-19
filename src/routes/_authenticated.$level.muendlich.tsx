import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { MUENDLICH_ENABLED } from "@/lib/features";
import { useMuendlichVisible } from "@/lib/useMuendlichVisible";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/$level/muendlich")({
  component: MuendlichLayoutGate,
});

/**
 * Direct-URL access gate for the student Mündlich module. Same policy as the
 * sidebar/header/dashboard nav items:
 *   - If MUENDLICH_ENABLED === true (module globally launched) → render.
 *   - Otherwise, if the viewer is an admin → render (developer preview).
 *   - Otherwise → bounce to dashboard so no student can reach any child
 *     Mündlich page by pasting a URL.
 *
 * Kept in the client component (not `beforeLoad`) because the visibility check
 * depends on auth state, which TanStack Start's `beforeLoad` context doesn't
 * expose in this project. The redirect happens on the very first render after
 * auth resolves — no Mündlich child renders in the meantime because we return
 * null until `roleLoading` is complete.
 */
function MuendlichLayoutGate() {
  const { level } = useParams({ from: "/_authenticated/$level/muendlich" });
  const { loading, roleLoading } = useAuth();
  const muendlichVisible = useMuendlichVisible();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!muendlichVisible) {
      navigate({ to: "/$level/dashboard", params: { level }, replace: true });
    }
  }, [loading, roleLoading, muendlichVisible, navigate, level]);

  // Wait until auth+role are resolved before deciding to render or redirect —
  // avoids briefly rendering the student Mündlich UI to a non-admin during the
  // async role fetch. Also avoids rendering it during the redirect itself.
  if (loading || roleLoading || !muendlichVisible) return null;

  // Reference the launch flag so future refactors can find this call-site via
  // grep for MUENDLICH_ENABLED — the flag itself isn't consumed here anymore.
  void MUENDLICH_ENABLED;

  return <Outlet />;
}

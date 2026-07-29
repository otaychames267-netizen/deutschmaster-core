import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Payment redesign: waiting/terminal states now render inline on the same
 * page as the rest of the flow (/d17/$orderId/) instead of a separate URL —
 * this route only exists so old links/bookmarks/emails still land somewhere
 * real.
 */
export const Route = createFileRoute("/_authenticated/d17/$orderId/status")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/d17/$orderId", params: { orderId: params.orderId } });
  },
});

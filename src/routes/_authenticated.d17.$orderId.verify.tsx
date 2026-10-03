import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Payment redesign: the upload step now lives on the same page as the
 * payment instructions (/d17/$orderId/) instead of a separate click-through
 * — this route only exists so old links/bookmarks still land somewhere real.
 */
export const Route = createFileRoute("/_authenticated/d17/$orderId/verify")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/d17/$orderId", params: { orderId: params.orderId } });
  },
});

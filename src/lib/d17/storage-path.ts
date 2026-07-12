/**
 * Single source of truth for the payment-screenshots storage path convention,
 * so the client upload (Phase 4) and the server's ownership check
 * (verify.functions.ts) never drift independently.
 */
export function buildScreenshotPath(userId: string, orderId: string, attemptNumber: number): string {
  return `${userId}/${orderId}/${attemptNumber}-${Date.now()}.png`;
}

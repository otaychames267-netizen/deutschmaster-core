/**
 * Single source of truth for the payment-screenshots storage path convention,
 * so the client upload and the server's ownership check
 * (verify.functions.ts) never drift independently. `slot` distinguishes the
 * two required screenshots (1 = Payment Success, 2 = Transaction
 * History/Journal D17) within one attempt.
 */
export function buildScreenshotPath(userId: string, orderId: string, attemptNumber: number, slot: 1 | 2 = 1): string {
  return `${userId}/${orderId}/${attemptNumber}-${slot}-${Date.now()}.png`;
}

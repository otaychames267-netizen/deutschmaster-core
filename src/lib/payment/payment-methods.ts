/**
 * Centralized config for the two manual (no-OCR) payment methods —
 * Virement Postal and Virement Bancaire. The existing D17 mobile-transfer
 * method (screenshot upload + OCR auto-verification) is untouched and
 * lives entirely in src/lib/d17/* — it is NOT part of this file, so this
 * file is the one place to update if these account details ever change.
 *
 * WhatsApp number matches the number already used platform-wide
 * (FloatingWhatsAppButton, AppHeader) — same business contact line.
 */

export const WHATSAPP_NUMBER = "20046880";

export const POSTAL_PAYMENT = {
  cardNumber: "5359 4014 2661 2392",
  accountHolder: "SHAMS EDDINE OTTAY",
};

export const BANCAIRE_PAYMENT = {
  rib: "32014788601210098149",
  accountHolder: "SHAMS EDDINE OTTAY",
};

export function buildWhatsAppReceiptUrl(params: { planName: string; amountTnd: number; methodLabel: string; email: string }): string {
  const message =
    `مرحبًا، قمت بدفع اشتراك AuraLingovia.\n\n` +
    `البريد الإلكتروني لحسابي: ${params.email}\n` +
    `الخطة: ${params.planName} – ${params.amountTnd} دينارًا\n` +
    `طريقة الدفع: ${params.methodLabel}\n\n` +
    `أرفقت وصل الدفع للتحقق منه.\n` +
    `شكرًا لكم.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

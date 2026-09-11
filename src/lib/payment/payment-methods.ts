/**
 * Centralized config for the three manual (no-OCR) payment methods —
 * Virement Postal, Virement Bancaire, and (as of 2026-08-19) D17. D17 used
 * to be a separate screenshot-upload + OCR auto-verification pipeline
 * (src/lib/d17/*) — that code and its d17_orders table are untouched and
 * still serve the orders already in flight there, but new D17 payments now
 * go through this same manual/WhatsApp-receipt flow as postal & bancaire.
 * This file is the one place to update if these account details ever change.
 *
 * WhatsApp number matches the number already used platform-wide
 * (FloatingWhatsAppButton, AppHeader) — same business contact line.
 */
import { OFFICIAL_D17_RECIPIENT } from "@/lib/d17/payment-config";

export const WHATSAPP_NUMBER = "46372158";

export const POSTAL_PAYMENT = {
  cardNumber: "5359 4014 2661 2392",
  accountHolder: "SHAMS EDDINE OTTAY",
};

export const BANCAIRE_PAYMENT = {
  rib: "32014788601210098149",
  accountHolder: "SHAMS EDDINE OTTAY",
};

export const D17_PAYMENT = {
  number: OFFICIAL_D17_RECIPIENT,
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

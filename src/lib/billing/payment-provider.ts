/**
 * payment-provider.ts — Provider Pattern seam for payment methods, mirroring
 * the structure of src/lib/import/vision-provider.ts (interface + concrete
 * classes + factory). This is an ADDITIVE FACADE ONLY: the live billing page
 * (src/routes/_authenticated.billing.tsx) keeps calling
 * createCheckoutSession/createD17Order directly, unchanged. Nothing in the
 * live request path is rerouted through this file — it exists purely to
 * prove the seam so that when the real D17 API/webhook becomes available,
 * only D17ManualProvider needs to be swapped for D17ApiProvider. No other
 * part of the payment system (subscription activation, package unlocking,
 * fraud detection, admin dashboard, reports, audit logs, UX) is redesigned.
 *
 * Each provider is a thin wrapper around the existing, already-hardened
 * *Impl functions — zero reimplementation, zero behavior change from
 * calling those functions directly.
 */

export type PlanCode = "schriftlich" | "muendlich" | "komplett";
export type PaymentMethod = "lemonsqueezy" | "d17_manual" | "d17_api";

export interface PaymentProvider {
  readonly name: PaymentMethod;
  createOrder(userId: string, planCode: PlanCode): Promise<Record<string, unknown>>;
}

class LemonSqueezyProvider implements PaymentProvider {
  readonly name = "lemonsqueezy" as const;
  async createOrder(userId: string, planCode: PlanCode) {
    const { createCheckoutSessionImpl } = await import("./checkout.functions");
    return createCheckoutSessionImpl(userId, planCode);
  }
}

class D17ManualProvider implements PaymentProvider {
  readonly name = "d17_manual" as const;
  async createOrder(userId: string, planCode: PlanCode) {
    const { createD17OrderImpl } = await import("@/lib/d17/orders.functions");
    return createD17OrderImpl(userId, planCode);
  }
}

/** Placeholder for the real D17 API/webhook integration — proves the seam
 * exists without pretending to implement it. Swapping this in for
 * D17ManualProvider (once the real API arrives) is the only intended future
 * change to this file. */
class D17ApiProvider implements PaymentProvider {
  readonly name = "d17_api" as const;
  async createOrder(): Promise<Record<string, unknown>> {
    throw new Error("D17ApiProvider is not yet available — the real D17 API/webhook integration hasn't been built. Use D17ManualProvider (\"d17_manual\") until then.");
  }
}

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  switch (method) {
    case "lemonsqueezy": return new LemonSqueezyProvider();
    case "d17_manual": return new D17ManualProvider();
    case "d17_api": return new D17ApiProvider();
  }
}

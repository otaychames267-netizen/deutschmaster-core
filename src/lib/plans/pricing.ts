import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * The price list shown to students (landing page + billing). The numbers come from the database (RPC get_plan_pricing → plans table, the same source the
 * order creation charges from), so a price change never needs a deploy. The constants below are only the fallback while the request is in flight or
 * fails — they are the prices as of 2026-10-11 and must match migration 20261011150000_plan_terms_and_offers.sql.
 */
export type SellablePlan = "schriftlich" | "komplett_ai";
export type Months = 1 | 2;

export interface TermPrice {
  months: Months;
  /** What is charged now. */
  price: number;
  /** The struck-through regular price — only present while it is a genuine reduction. */
  listPrice: number | null;
}
export interface PlanPricing {
  code: SellablePlan;
  terms: TermPrice[];
  /** ISO date while a launch offer is running, else null. */
  offerEndsAt: string | null;
}
export type PricingMap = Record<SellablePlan, PlanPricing>;

export const FALLBACK_PRICING: PricingMap = {
  schriftlich: { code: "schriftlich", offerEndsAt: null, terms: [{ months: 1, price: 30, listPrice: null }, { months: 2, price: 50, listPrice: 60 }] },
  komplett_ai: { code: "komplett_ai", offerEndsAt: "2026-12-10T22:59:59Z", terms: [{ months: 1, price: 55, listPrice: 65 }, { months: 2, price: 110, listPrice: 130 }] },
};

interface RpcPlan { code: string; offer_ends_at: string | null; terms: { months: number; price: number | string; list_price: number | string | null }[] }

export function parsePricing(raw: unknown): PricingMap | null {
  if (!Array.isArray(raw)) return null;
  const out: Partial<PricingMap> = {};
  for (const p of raw as RpcPlan[]) {
    if (p.code !== "schriftlich" && p.code !== "komplett_ai") continue;
    const terms = (p.terms ?? [])
      .filter((t) => t.months === 1 || t.months === 2)
      .map((t) => ({ months: t.months as Months, price: Number(t.price), listPrice: t.list_price == null ? null : Number(t.list_price) }))
      .filter((t) => Number.isFinite(t.price) && t.price > 0);
    if (!terms.some((t) => t.months === 1)) continue;
    out[p.code] = { code: p.code, terms, offerEndsAt: p.offer_ends_at };
  }
  return out.schriftlich && out.komplett_ai ? (out as PricingMap) : null;
}

export function usePlanPricing(): PricingMap {
  const [pricing, setPricing] = useState<PricingMap>(FALLBACK_PRICING);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("get_plan_pricing");
        if (error || !alive) return;
        const parsed = parsePricing(data);
        if (parsed) setPricing(parsed);
      } catch { /* keep the fallback */ }
    })();
    return () => { alive = false; };
  }, []);
  return pricing;
}

export function termOf(pricing: PricingMap, code: SellablePlan, months: Months): TermPrice {
  const p = pricing[code];
  return p.terms.find((t) => t.months === months) ?? p.terms.find((t) => t.months === 1)!;
}

export function hasTerm(pricing: PricingMap, months: Months): boolean {
  return (Object.values(pricing) as PlanPricing[]).every((p) => p.terms.some((t) => t.months === months));
}

/** Money saved against the regular price (0 when there is no reduction). */
export function savedAmount(t: TermPrice): number {
  return t.listPrice && t.listPrice > t.price ? t.listPrice - t.price : 0;
}
export function savedPercent(t: TermPrice): number {
  return t.listPrice && t.listPrice > t.price ? Math.round(((t.listPrice - t.price) / t.listPrice) * 100) : 0;
}
/** The biggest saving a student can get by picking the 2-month pack, over all plans (for the toggle's badge). */
export function maxPackSaving(pricing: PricingMap): number {
  return Math.max(0, ...(Object.values(pricing) as PlanPricing[]).map((p) => {
    const t = p.terms.find((x) => x.months === 2);
    return t ? savedAmount(t) : 0;
  }));
}
export function perMonth(t: TermPrice): number {
  return Math.round((t.price / t.months) * 100) / 100;
}

/** Whole days left until the offer ends (0 = ends today); null when there is no running offer. */
export function offerDaysLeft(endsAt: string | null, now = Date.now()): number | null {
  if (!endsAt) return null;
  const ms = Date.parse(endsAt) - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.floor(ms / 86_400_000);
}

export const MONTHS_LABEL: Record<Months, string> = { 1: "1 month", 2: "2 months" };

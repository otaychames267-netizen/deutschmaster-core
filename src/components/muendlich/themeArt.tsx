/**
 * Decorative per-category art for the Mündlich topic cards — a gradient +
 * icon pairing per theme_category, shared between Teil 2 and Teil 3 so the
 * same category always reads the same color/icon across both pages. No
 * external images: everything here is CSS gradients + a lucide-react icon,
 * which keeps the visuals fully self-hosted (no third-party image licensing
 * to worry about) while still giving each card its own distinct look.
 */
import {
  HeartPulse, Cpu, Briefcase, GraduationCap, Users, ShoppingBag, Tv, Home,
  Wallet, Plane, TreePalm, HandHeart, Sparkles, Camera, BookOpen, Clapperboard,
  Trophy, Music, HeartHandshake, Compass, type LucideIcon,
} from "lucide-react";

export interface ThemeArt { icon: LucideIcon; from: string; to: string }

const THEME_ART: Record<string, ThemeArt> = {
  Gesundheit: { icon: HeartPulse, from: "#059669", to: "#34d399" },
  Technologie: { icon: Cpu, from: "#0284c7", to: "#38bdf8" },
  Beruf: { icon: Briefcase, from: "#b45309", to: "#fbbf24" },
  Bildung: { icon: GraduationCap, from: "#4338ca", to: "#818cf8" },
  Gesellschaft: { icon: Users, from: "#be123c", to: "#fb7185" },
  Konsum: { icon: ShoppingBag, from: "#c2410c", to: "#fb923c" },
  Medien: { icon: Tv, from: "#6d28d9", to: "#a78bfa" },
  Familie: { icon: Home, from: "#be185d", to: "#f472b6" },
  Wohnen: { icon: Home, from: "#0f766e", to: "#2dd4bf" },
  Finanzen: { icon: Wallet, from: "#a16207", to: "#facc15" },
  Reisen: { icon: Plane, from: "#0e7490", to: "#22d3ee" },
  Freizeit: { icon: TreePalm, from: "#4d7c0f", to: "#a3e635" },
  "Soziales Engagement": { icon: HandHeart, from: "#a21caf", to: "#e879f9" },
  // Mündlich Teil 1's own 8 topics (1 B1 "Bildbeschreibung" + 7 B2
  // Präsentation themes) — a separate, smaller fixed set from the Teil 2/3
  // discussion categories above, so these never collided with any of them
  // and theme_category was NULL for all 8 (real gap found 2026-10-04: every
  // Teil 1 card silently fell back to the same generic grey/Sparkles art,
  // looking repetitive/unpolished next to Teil 2/3's distinct cards).
  Bildbeschreibung: { icon: Camera, from: "#334155", to: "#94a3b8" },
  Buch: { icon: BookOpen, from: "#92400e", to: "#f59e0b" },
  Film: { icon: Clapperboard, from: "#6b21a8", to: "#d8b4fe" },
  Sportereignis: { icon: Trophy, from: "#b91c1c", to: "#fca5a5" },
  Musikveranstaltung: { icon: Music, from: "#be185d", to: "#f9a8d4" },
  "Wichtige Person im Leben": { icon: HeartHandshake, from: "#065f46", to: "#6ee7b7" },
  "Wichtige Erfahrung": { icon: Compass, from: "#1e40af", to: "#93c5fd" },
};

const FALLBACK: ThemeArt = { icon: Sparkles, from: "#475569", to: "#94a3b8" };

export function getThemeArt(category: string | null | undefined): ThemeArt {
  return (category && THEME_ART[category]) || FALLBACK;
}

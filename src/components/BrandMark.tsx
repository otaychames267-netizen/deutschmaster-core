import { useId } from "react";

/**
 * The AuraLingovia mark — a geometric "A" with a graduation cap fused into
 * its apex, wrapped in a thin crescent ring, with a small speech-bubble
 * accent. Renders its own gold gradient (not `currentColor`) since the gold
 * tone is a fixed part of the identity, not something call sites should
 * override.
 *
 * This is the SIMPLIFIED cut (no tower/leaves) — every call site renders it
 * at 16-36px, well under the ~48px threshold where the full-detail version
 * (used for icon-512.png / og-image.png) stays legible. Two gradient stops
 * away from clean at those sizes is worse than one clean mark used
 * consistently, so the simplified cut is what ships everywhere inline.
 *
 * useId() keeps the gradient id collision-free when multiple instances
 * render on the same page (header + footer, etc.) — a hardcoded id would
 * duplicate in the DOM and every instance after the first would pick up
 * whichever gradient happened to win.
 */
interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  const gradId = `brandmark-gold-${useId()}`;

  return (
    <svg viewBox="60 30 280 320" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9782c" />
          <stop offset="0.28" stopColor="#e7bb54" />
          <stop offset="0.48" stopColor="#fbedbe" />
          <stop offset="0.65" stopColor="#f0cd76" />
          <stop offset="1" stopColor="#b8842f" />
        </linearGradient>
      </defs>
      <path d="M 111 337 A 155 155 0 1 1 289 337" fill="none" stroke={`url(#${gradId})`} strokeWidth="8" strokeLinecap="round" />
      <g>
        <path d="M 168 292 q0 -14 16 -14 h48 q16 0 16 14 v20 q0 14 -16 14 h-26 l-14 13 v-13 h-8 q-16 0 -16 -14 Z" fill={`url(#${gradId})`} />
        <circle cx="192" cy="308" r="3.4" fill="currentColor" />
        <circle cx="205" cy="308" r="3.4" fill="currentColor" />
        <circle cx="218" cy="308" r="3.4" fill="currentColor" />
      </g>
      <path
        fillRule="evenodd"
        fill={`url(#${gradId})`}
        d="M 182 68 L 218 68 L 312 324 Q 317 337 304 337 L 266 337 Q 256 337 253 327 L 238 286 L 162 286 L 147 327 Q 144 337 134 337 L 96 337 Q 83 337 88 324 Z M 200 130 L 170 244 L 230 244 Z"
      />
      <g>
        <path fill={`url(#${gradId})`} d="M 182 68 L 218 68 L 214 50 L 186 50 Z" />
        <g transform="translate(200,43) rotate(-3)">
          <path fill={`url(#${gradId})`} d="M0,-13 L74,-1 L0,11 L-74,-1 Z" />
          <circle cx="0" cy="-1" r="5" fill="currentColor" />
          <path d="M0,-1 C 12,9 26,12 35,26" stroke={`url(#${gradId})`} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M30,24 L41,24 L39,44 Q35,49 32,44 Z" fill={`url(#${gradId})`} />
        </g>
      </g>
    </svg>
  );
}

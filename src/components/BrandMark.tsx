/**
 * The AuraLingovia sparkmark — an 8-point radiating icon standing for
 * "aura" (radiance/glow). Renders in `currentColor` so every call site
 * controls its own color via the surrounding text/icon color, matching
 * how the lucide icons it replaces were used.
 */
interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 68 68" fill="currentColor" className={className} aria-hidden="true">
      <g transform="translate(34,34)">
        <path d="M0,-30 Q3.5,-12 0,0 Q-3.5,-12 0,-30 Z" />
        <path d="M0,-30 Q3.5,-12 0,0 Q-3.5,-12 0,-30 Z" transform="rotate(90)" />
        <path d="M0,-30 Q3.5,-12 0,0 Q-3.5,-12 0,-30 Z" transform="rotate(180)" />
        <path d="M0,-30 Q3.5,-12 0,0 Q-3.5,-12 0,-30 Z" transform="rotate(270)" />
        <path d="M0,-18 Q2.6,-7 0,0 Q-2.6,-7 0,-18 Z" transform="rotate(45)" />
        <path d="M0,-18 Q2.6,-7 0,0 Q-2.6,-7 0,-18 Z" transform="rotate(135)" />
        <path d="M0,-18 Q2.6,-7 0,0 Q-2.6,-7 0,-18 Z" transform="rotate(225)" />
        <path d="M0,-18 Q2.6,-7 0,0 Q-2.6,-7 0,-18 Z" transform="rotate(315)" />
      </g>
    </svg>
  );
}

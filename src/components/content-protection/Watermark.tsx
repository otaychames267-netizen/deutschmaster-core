/**
 * Traceability overlay, not a barrier — a screenshot or photo of protected
 * content carries the logged-in user's email, tiled subtly across the page,
 * so a leaked copy can be traced back to the account it came from.
 * pointer-events: none so it never interferes with the actual content
 * underneath; low opacity so it doesn't hurt legibility.
 */
export function Watermark({ label }: { label: string }) {
  const tile = encodeURIComponent(label);
  // The label is centred in its tile (x=210) and the tile is large: the old tile anchored the text at x=0, so every tile
  // showed only a half-cut fragment of the email ("…2026@gmail.com") and, at 320x160, those fragments crossed every
  // other line of body text — on a desktop screen the page read as words running into each other. One whole,
  // fainter label per 420x260 tile still carries the account for tracing but crosses far less text.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='260'>
    <text x='210' y='130' transform='rotate(-28 210 130)' text-anchor='middle'
      font-family='sans-serif' font-size='12' fill='rgba(128,128,128,0.11)'>${tile}</text>
  </svg>`;
  const dataUri = `url("data:image/svg+xml,${svg.replace(/\s+/g, " ")}")`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40"
      style={{ backgroundImage: dataUri, backgroundRepeat: "repeat" }}
    />
  );
}

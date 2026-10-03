/**
 * Traceability overlay, not a barrier — a screenshot or photo of protected
 * content carries the logged-in user's email, tiled subtly across the page,
 * so a leaked copy can be traced back to the account it came from.
 * pointer-events: none so it never interferes with the actual content
 * underneath; low opacity so it doesn't hurt legibility.
 */
export function Watermark({ label }: { label: string }) {
  const tile = encodeURIComponent(label);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='160'>
    <text x='0' y='80' transform='rotate(-28 160 80)' text-anchor='middle'
      font-family='sans-serif' font-size='13' fill='rgba(128,128,128,0.16)'>${tile}</text>
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

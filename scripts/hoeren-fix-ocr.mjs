// No-op passthrough retained for API compatibility — the poppler bbox-based
// extraction (hoeren-extract-final.mjs) already segments words correctly, so
// no post-hoc spacing correction is needed or applied anymore.
export function fixOcrSpacing(text) {
  return text;
}

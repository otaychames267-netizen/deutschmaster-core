// Guards against a real-world failure mode: env vars that get sent as HTTP header
// values (Supabase's URL/anon/service-role keys are attached to every request as
// `apikey`/`Authorization` headers by supabase-js) must be ISO-8859-1-encodable,
// because the Fetch/Headers spec rejects anything outside that range. Copy-pasting
// a key from a chat message, PDF, or word-wrapped terminal can silently introduce
// a non-breaking space, zero-width character, or BOM that passes a quick visual
// check but throws deep inside the browser's fetch() with a cryptic message
// ("String contains non ISO-8859-1 code point") on the first request. Sanitizing +
// validating at client-construction time turns that into an immediate, actionable
// error naming the exact variable and character instead.

// Zero-width space (U+200B), zero-width non-joiner (U+200C), zero-width joiner
// (U+200D), BOM (U+FEFF), non-breaking space (U+00A0) — invisible in most editors
// and chat UIs, but each breaks header encoding once pasted into a key/URL.
const INVISIBLE_CHAR_CODES = [0x200b, 0x200c, 0x200d, 0xfeff, 0x00a0];
const INVISIBLE_CHARS = new RegExp(
  `[${INVISIBLE_CHAR_CODES.map((c) => String.fromCharCode(c)).join('')}]`,
  'g',
);

export function sanitizeEnvValue(name: string, raw: string): string {
  const value = raw.trim().replace(INVISIBLE_CHARS, '');

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 0xff) {
      throw new Error(
        `${name} contains a character that cannot be sent in an HTTP header ` +
          `(found "${value[i]}" at position ${i}, code point U+${code.toString(16).toUpperCase().padStart(4, '0')}). ` +
          `This is almost always caused by copy-pasting the value from somewhere that adds ` +
          `hidden formatting. Go to the Supabase dashboard → Settings → API, select only the ` +
          `key/URL text itself, copy it, and re-paste it as ${name} — then redeploy.`,
      );
    }
  }

  return value;
}

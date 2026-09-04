/** Maps a getUserMedia() rejection to an actionable, German, exam-UI-consistent
 * message — the raw DOMException.message (e.g. "Permission denied") is
 * English, browser/OS-specific wording never meant for end users, and was
 * leaking directly into the German exam UI. Different failure causes also
 * need different guidance: "allow microphone access" is actively wrong advice
 * when the real problem is no mic device present, or the mic being held by
 * another app (a live video call, for example) — telling a user to fix
 * browser permissions for that gets them nowhere. */
export function describeMicError(e: unknown): string {
  const name = (e as { name?: string } | undefined)?.name;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Kein Mikrofonzugriff — bitte in den Browser-Einstellungen erlauben und die Seite neu laden.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Kein Mikrofon gefunden — bitte ein Mikrofon anschließen und die Seite neu laden.";
    case "NotReadableError":
      return "Das Mikrofon wird bereits von einer anderen Anwendung verwendet — bitte andere Programme (z. B. Videoanrufe) schließen und erneut versuchen.";
    case "AbortError":
      return "Der Mikrofonzugriff wurde unterbrochen. Bitte versuchen Sie es erneut.";
    default:
      return "Mikrofonzugriff nicht möglich. Bitte versuchen Sie es erneut.";
  }
}

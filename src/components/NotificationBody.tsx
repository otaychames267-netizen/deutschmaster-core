import { ChevronLeft, ChevronRight } from "lucide-react";
import { internalPath, timeAgo, timeAgoAr, type AppNotification } from "@/lib/notification-format";

/** Notification types that get the branded card (content + announcements); everything else keeps the plain row. */
export function isBranded(type: string): boolean {
  return type === "content" || type === "announcement" || type === "alert";
}

type Kind = "greeting" | "theme" | "warn" | "wish" | "plain";
interface Para { kind: Kind; lines: string[] }

const THEME_START = /^(🎧|📖|📝|🗣️)/u;
const NUMBERED = /^(?:[0-9]️⃣|🔟|\d+\.)\s/u;
const NOTE_LINE = /^\s*↳\s?/u;

/** The server writes the message as paragraphs (greeting / theme block / availability / warning / wishes);
 * the card styles each kind of paragraph, so one text is both the push body and a designed card. */
export function parseBody(body: string): Para[] {
  const paras = body.split(/\n{2,}/).map((p) => p.split("\n")).filter((l) => l.join("").trim() !== "");
  return paras.map((lines, i): Para => {
    const first = lines[0].trim();
    let kind: Kind = "plain";
    if (first.startsWith("⚠️")) kind = "warn";
    else if (THEME_START.test(first)) kind = "theme";
    else if (i === 0 && /السلام/u.test(first)) kind = "greeting";
    else if (i === paras.length - 1 && /🍀/u.test(lines.join(" "))) kind = "wish";
    return { kind, lines };
  });
}

function ThemeBlock({ lines }: { lines: string[] }) {
  const [label, ...rest] = lines;
  return (
    <div className="aura-note-theme" dir="auto">
      <p className="aura-note-theme-label text-[11px] leading-snug">{label}</p>
      {rest.map((l, i) =>
        NOTE_LINE.test(l) ? (
          <p key={i} className="mt-0.5 ps-3 text-[11px] leading-relaxed opacity-75">{l.replace(NOTE_LINE, "↳ ")}</p>
        ) : (
          <p key={i} className={`mt-1 leading-snug ${NUMBERED.test(l) ? "text-[13px] font-bold" : "text-xs"}`}>{l}</p>
        ),
      )}
    </div>
  );
}

function Paragraphs({ paras, compact }: { paras: Para[]; compact: boolean }) {
  // Compact (bell): only what matters at a glance — the theme block(s); fall back to the first lines.
  let shown = paras;
  if (compact) {
    // A warning that comes BEFORE the theme block is the message itself (e.g. an exam alert) and stays visible;
    // the generic "don't memorise the codes" warning comes after the theme block and is left for the full view.
    const firstTheme = paras.findIndex((p) => p.kind === "theme");
    const keep = paras.filter((p, i) => p.kind === "theme" || (p.kind === "warn" && (firstTheme === -1 || i < firstTheme)));
    shown = keep.length > 0 ? keep : paras.slice(0, 2);
  }
  return (
    <div className="space-y-2">
      {shown.map((p, i) => {
        if (p.kind === "theme") return <ThemeBlock key={i} lines={p.lines} />;
        if (p.kind === "warn") {
          return (
            <div key={i} className="aura-note-warn" dir="auto">
              {p.lines.map((l, j) => (
                <p key={j} className={`text-xs leading-relaxed ${j === 0 ? "font-bold" : "opacity-85"}`}>{l}</p>
              ))}
            </div>
          );
        }
        return (
          <p
            key={i} dir="auto"
            className={`whitespace-pre-line text-xs leading-relaxed ${
              p.kind === "wish" ? "aura-note-wish" : p.kind === "greeting" ? "font-semibold" : "opacity-85"
            }`}
          >
            {p.lines.join("\n")}
          </p>
        );
      })}
    </div>
  );
}

/** Body only (admin previews wrap it in .aura-note themselves). */
export function NotificationBody({ body, compact = false }: { body: string; compact?: boolean }) {
  return <Paragraphs paras={parseBody(body)} compact={compact} />;
}

/** The branded notification: logo + wordmark kicker, title, designed body, time and "Open". */
export function BrandedNotification({
  n, variant, onOpen,
}: { n: AppNotification; variant: "bell" | "page"; onOpen: () => void }) {
  const compact = variant === "bell";
  const target = internalPath(n.action_url);
  // Arabic messages lay the whole card out right-to-left (logo on the right, text starting at the right edge).
  const rtl = /\p{Script=Arabic}/u.test(n.title + n.body);
  const Chev = rtl ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button" onClick={onOpen} dir={rtl ? "rtl" : "ltr"}
      className={`aura-note block w-full text-start transition-transform hover:-translate-y-px ${n.type === "alert" ? "aura-note--alert" : ""} ${n.read ? "aura-note--read" : ""} ${compact ? "p-3" : "p-5"}`}
    >
      {n.type === "alert" && (
        <div className="aura-note-alertbar" aria-hidden>
          <span>⚠</span><span>{rtl ? "تنبيه مهم" : "Important notice"}</span>
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <img src="/favicon.svg" alt="" width={compact ? 26 : 32} height={compact ? 26 : 32} className="aura-note-logo shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={`aura-note-kicker ${compact ? "text-[9px]" : "text-[10px]"}`}>AuraLingovia</p>
          <p dir="auto" className={`truncate font-bold ${compact ? "text-xs" : "text-sm"}`}>{n.title}</p>
        </div>
        {!n.read && <span className="aura-note-dot shrink-0" aria-label="unread" />}
      </div>
      <div className={compact ? "mt-2.5" : "mt-3.5"}>
        <NotificationBody body={n.body} compact={compact} />
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] opacity-70">
        <span>{rtl ? timeAgoAr(n.created_at) : timeAgo(n.created_at)}</span>
        {target && (
          <span className="ms-auto flex items-center gap-0.5 font-bold text-[#8a5f17] opacity-100 dark:text-[#e7bb54]">
            {rtl ? "فتح" : "Open"} <Chev className="h-3 w-3" />
          </span>
        )}
      </div>
    </button>
  );
}

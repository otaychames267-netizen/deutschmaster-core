import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, ClipboardCheck, Lock, Mic, Users } from "lucide-react";

/**
 * The KI-Sprachtrainer card on the Mündlich page. It wears the Platinum plan's own skin (navy/metal ground, silver accent — see `.plan-premium--platinum` / `.tier-platinum`), so the
 * paid feature and the plan that sells it read as one thing. Every line is backed by the product (see PlanBenefits.tsx KOMPLETT_BENEFITS): the tutor is a 1:1 session, Teil 1 with the examiner and
 * Teil 2 + 3 as a conversation with a practice partner (a different voice), 10–14 minutes, an estimated score out of 75 and a correction report — and it does NOT assess pronunciation, which
 * the card says so nobody expects it.
 *
 * Full-width: on a wide screen the title and the button sit on the left, the three features on the right; on a phone everything stacks (title, features, button).
 * `locked` = the viewer does not have the AI module: same card, the button reads "Unlock with Platinum" and leads to the plan page. Level B2 only (the caller decides).
 */
const FEATURES = [
  { icon: Mic, title: "Teil 1 · 2 · 3", text: "The complete oral exam in one session — about 10 to 14 minutes." },
  { icon: Users, title: "Examiner + practice partner", text: "Teil 1 with the examiner; Teil 2 and 3 as a real conversation with a second voice." },
  { icon: ClipboardCheck, title: "Score & correction report", text: "An estimated score out of 75, your mistakes and better phrasings." },
] as const;

export function AiTutorCard({ locked, href }: { locked: boolean; href: string }) {
  return (
    <Link
      to={href as never}
      aria-label={locked ? "KI-Sprachtrainer — included in the Platinum plan, view plans" : "KI-Sprachtrainer — start a session"}
      className="plan-premium plan-premium--platinum tier-platinum group relative flex flex-col gap-6 rounded-2xl p-6 text-left transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:p-8 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-x-10 md:gap-y-6"
    >
      {/* title block */}
      <div className="md:col-start-1 md:row-start-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gold ring-1 ring-inset ring-gold/30">
          {locked && <Lock className="h-3 w-3" aria-hidden />} Platinum
        </span>
        <div className="mt-4 flex items-center gap-3.5">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/35 via-gold/10 to-transparent text-gold shadow-[0_0_24px_-6px_var(--color-gold)] ring-1 ring-inset ring-gold/45">
            <Bot className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight tracking-tight text-white">KI-Sprachtrainer</p>
            <p className="mt-1 text-[11.5px] font-medium text-white/60">1:1 · KI-Prüferin + KI-Partnerin</p>
          </div>
        </div>
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-white/75">Practise the oral exam out loud and get feedback you can act on.</p>
      </div>

      {/* features */}
      <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:border-l md:border-white/10 md:pl-10">
        <ul className="space-y-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold ring-1 ring-inset ring-gold/30">
                <f.icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-white">{f.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-white/65">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[11px] leading-snug text-white/45">Feedback covers content and language (grammar, vocabulary, phrases). Pronunciation is not assessed.</p>
      </div>

      {/* button */}
      <div className="md:col-start-1 md:row-start-2 md:self-end">
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-gold-foreground shadow-lg shadow-black/30 transition-all group-hover:brightness-110 md:w-auto md:min-w-[14rem]">
          {locked ? <><Lock className="h-4 w-4" aria-hidden /> Unlock with Platinum</> : <>Start a session <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></>}
        </span>
      </div>
    </Link>
  );
}

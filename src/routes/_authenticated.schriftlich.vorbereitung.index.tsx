import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, BookOpen, Headphones, PenLine, Wrench,
  ChevronRight, TrendingUp, Lightbulb,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/")({
  component: SchriftlichVorbereitungHub,
});

const SKILLS = [
  {
    icon: BookOpen,
    label: "Lesen",
    description: "Reading comprehension — match headings, multiple choice, find information",
    time: "40 min",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    hover: "hover:border-blue-500/40 hover:bg-blue-500/5",
    gradient: "from-blue-500/8 to-transparent",
    parts: [
      { label: "Teil 1 — Überschriften zuordnen", to: "/schriftlich/vorbereitung/lesen/teil-1" },
      { label: "Teil 2 — Multiple Choice",         to: "/schriftlich/vorbereitung/lesen/teil-2" },
      { label: "Teil 3 — Informationen finden",    to: "/schriftlich/vorbereitung/lesen/teil-3" },
    ],
  },
  {
    icon: Headphones,
    label: "Hören",
    description: "Listening comprehension — radio bulletins, lectures, everyday conversations",
    time: "40 min",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    hover: "hover:border-violet-500/40 hover:bg-violet-500/5",
    gradient: "from-violet-500/8 to-transparent",
    parts: [
      { label: "Teil 1 — Radiomeldungen",          to: "/schriftlich/vorbereitung/hoeren/teil-1" },
      { label: "Teil 2 — Vortrag / Interview",     to: "/schriftlich/vorbereitung/hoeren/teil-2" },
      { label: "Teil 3 — Alltagsgespräche",        to: "/schriftlich/vorbereitung/hoeren/teil-3" },
    ],
  },
  {
    icon: Wrench,
    label: "Sprachbausteine",
    description: "Grammar & vocabulary — fill in gaps in sentences and a formal letter",
    time: "20 min",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    hover: "hover:border-emerald-500/40 hover:bg-emerald-500/5",
    gradient: "from-emerald-500/8 to-transparent",
    parts: [
      { label: "Teil 1 — Lückentext (Sätze)",      to: "/schriftlich/vorbereitung/sprachbausteine/teil-1" },
      { label: "Teil 2 — Lückentext (Brief)",      to: "/schriftlich/vorbereitung/sprachbausteine/teil-2" },
    ],
  },
  {
    icon: PenLine,
    label: "Schreiben",
    description: "Written expression — formal complaint letter and request for information",
    time: "45 min",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    hover: "hover:border-amber-500/40 hover:bg-amber-500/5",
    gradient: "from-amber-500/8 to-transparent",
    parts: [
      { label: "Beschwerde — Formal complaint",    to: "/schriftlich/vorbereitung/schreiben/beschwerde" },
      { label: "Bitte um Informationen",           to: "/schriftlich/vorbereitung/schreiben/bitte" },
    ],
  },
];

function SchriftlichVorbereitungHub() {
  const [openSkill, setOpenSkill] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">

      {/* ── Breadcrumb header ─────────────────────────────────── */}
      <div>
        <Link
          to="/schriftlich"
          className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Schriftlich
        </Link>
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/schriftlich" className="hover:text-foreground transition-colors">Schriftlich</Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Vorbereitung</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Vorbereitung</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a section to practice. Expand a skill to see its individual Teile.
        </p>
      </div>

      {/* ── Tip ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-sm text-foreground">
          <strong>Study strategy:</strong> Start with Lesen — highest-weighted section. Then Hören, then Sprachbausteine. Practise Schreiben last. Once confident, run a full <Link to="/schriftlich/pruefung" className="font-bold text-blue-500 hover:underline">Prüfungssimulation</Link>.
        </p>
      </div>

      {/* ── Skill accordions ─────────────────────────────────── */}
      <div className="space-y-3">
        {SKILLS.map(skill => {
          const isOpen = openSkill === skill.label;
          return (
            <div
              key={skill.label}
              className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                isOpen ? `${skill.border} bg-card shadow-md` : "border-border bg-card hover:shadow-sm"
              }`}
            >
              <button
                onClick={() => setOpenSkill(isOpen ? null : skill.label)}
                className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-muted/30"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${skill.bg} ring-1 ${skill.border} transition-all ${isOpen ? "scale-105" : ""}`}>
                  <skill.icon className={`h-5 w-5 ${skill.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="font-black text-foreground text-base">{skill.label}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {skill.parts.length} Teile · {skill.time}
                  </p>
                </div>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${isOpen ? `${skill.bg} ${skill.color}` : "bg-muted text-muted-foreground"}`}>
                  <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border bg-muted/20 px-5 pb-5 pt-4">
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{skill.description}</p>
                  <div className="space-y-2">
                    {skill.parts.map((part, i) => (
                      <Link
                        key={part.to}
                        to={part.to}
                        className={`group flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm bg-card ${skill.hover} ${skill.border}`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${skill.bg} ${skill.color}`}>
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-semibold text-foreground">{part.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Scoring weights ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">How scoring works</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Lesen",           weight: "30%", color: "text-blue-500",    bg: "bg-blue-500/10" },
            { label: "Hören",           weight: "30%", color: "text-violet-500",  bg: "bg-violet-500/10" },
            { label: "Sprachbausteine", weight: "20%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Schreiben",       weight: "20%", color: "text-amber-500",   bg: "bg-amber-500/10" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl ${s.bg} px-3 py-2.5 text-center`}>
              <p className={`text-lg font-black ${s.color}`}>{s.weight}</p>
              <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

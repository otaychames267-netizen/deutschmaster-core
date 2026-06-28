import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  HelpCircle, MessageCircle, Mail, ChevronDown, ChevronRight,
  BookOpen, Shield, CreditCard, GraduationCap, Zap,
  FileText, Bell, Search, Settings, Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/help")({
  component: HelpPage,
});

const FAQ_SECTIONS = [
  {
    icon: GraduationCap,
    color: "text-blue-500 bg-blue-500/10",
    title: "Getting Started",
    items: [
      {
        q: "What is AuraLingovia?",
        a: "AuraLingovia is a premium TELC B2 exam preparation platform covering all written (Schriftlich) and oral (Mündlich) components. You practice with real exam-style content, track your progress, and build fluency at your own pace.",
      },
      {
        q: "How do I choose between Schriftlich and Mündlich?",
        a: "The Schriftlich module covers the written exam: Lesen (reading), Hören (listening), Sprachbausteine (grammar), and Schreiben (writing). Mündlich covers the oral exam: Präsentation, Thema sprechen, and Gemeinsam planen. The Komplett plan gives you access to both.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes — when you register, you receive a 3-day free trial with full access to your chosen plan. No credit card is required to start.",
      },
      {
        q: "What exam level is this platform for?",
        a: "Currently AuraLingovia focuses on TELC B2 (Deutsch B2). B1 content is planned for a future release.",
      },
    ],
  },
  {
    icon: CreditCard,
    color: "text-violet-500 bg-violet-500/10",
    title: "Billing & Subscription",
    items: [
      {
        q: "What are the available plans and prices?",
        a: "Schriftlich: 25 TND/month — covers all written exam components. Mündlich: 45 TND/month — covers the oral exam. Komplett: 60 TND/month — written + oral, best value (save 10 TND vs. buying both separately).",
      },
      {
        q: "How do I upgrade or change my plan?",
        a: "Go to Billing in the sidebar. You can see all available plans and switch at any time. Downgrades take effect at the next billing cycle.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes, you can cancel your subscription at any time. You retain access until the end of your current billing period.",
      },
      {
        q: "When will Stripe payments be enabled?",
        a: "Payment processing via Stripe will be activated shortly. During the launch phase, free trials are granted automatically. You'll be notified when billing goes live.",
      },
    ],
  },
  {
    icon: BookOpen,
    color: "text-emerald-500 bg-emerald-500/10",
    title: "Studying & Content",
    items: [
      {
        q: "What content is inside each module?",
        a: "Each Teil (part) contains exercises modeled after real TELC exams: multiple choice, gap fill, matching, short answer, and writing tasks. Audio files accompany Hören exercises. PDFs from past exams are available in the PDF library.",
      },
      {
        q: "How does the scoring and XP system work?",
        a: "Every completed exercise awards XP based on difficulty and accuracy. XP accumulates to raise your level. Your dashboard shows total XP, current level, study streak, and exercise count.",
      },
      {
        q: "What is the study streak?",
        a: "Your streak counts consecutive days you complete at least one exercise. Keeping a streak active is one of the strongest predictors of exam success. Streaks reset if you skip a day.",
      },
      {
        q: "How do I track my progress?",
        a: "Your Dashboard shows continue-learning cards, a weekly activity chart, goals, and achievements. The Statistics page has detailed breakdowns by module, Teil, and time period.",
      },
    ],
  },
  {
    icon: Shield,
    color: "text-amber-500 bg-amber-500/10",
    title: "Account & Security",
    items: [
      {
        q: "How do I change my password?",
        a: "Go to Security in the sidebar. Enter your current password, then your new password twice. Passwords must be at least 8 characters and mix letters and numbers.",
      },
      {
        q: "How do I update my email address?",
        a: "Go to Security → Change Email. Enter the new address and you'll receive a confirmation link. Your old email stays active until you verify the new one.",
      },
      {
        q: "How do I sign out of all devices?",
        a: "Go to Security → Sign Out All Devices. This revokes all active sessions globally, including any device you may have forgotten to log out of.",
      },
      {
        q: "Is my data safe?",
        a: "All data is stored in Supabase (PostgreSQL) with Row-Level Security — you can only access your own records. Passwords are hashed by Supabase Auth. We never store plain-text credentials.",
      },
    ],
  },
  {
    icon: Bell,
    color: "text-rose-500 bg-rose-500/10",
    title: "Notifications & Referrals",
    items: [
      {
        q: "How do notifications work?",
        a: "You receive notifications for subscription changes, exam reminders, and platform announcements. Access them from the bell icon in the header or from Notifications in the sidebar.",
      },
      {
        q: "What is the referral program?",
        a: "Share your unique referral link with friends. When they subscribe using your link, you both earn rewards. Track your referrals and rewards on the Referral Program page.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-foreground leading-snug">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
      )}
    </div>
  );
}

function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? FAQ_SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(
          item =>
            item.q.toLowerCase().includes(query.toLowerCase()) ||
            item.a.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : FAQ_SECTIONS;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">

      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 px-8 py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20">
          <HelpCircle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Help Center</h1>
        <p className="mt-2 text-sm text-muted-foreground">Find answers to common questions about AuraLingovia.</p>

        {/* Search */}
        <div className="relative mt-6 mx-auto max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search the FAQ…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* FAQ sections */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No results for "<span className="font-semibold text-foreground">{query}</span>". Try a different keyword.</p>
        </div>
      ) : (
        filtered.map(section => (
          <div key={section.title} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${section.color}`}>
                <section.icon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-black text-foreground">{section.title}</h2>
            </div>
            <div className="px-6">
              {section.items.map(item => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Contact / Support card */}
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:support@auralingovia.com"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Email support</p>
            <p className="mt-0.5 text-xs text-muted-foreground">support@auralingovia.com</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>

        <a
          href="https://t.me/auralingovia"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
            <MessageCircle className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Telegram support</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Fast replies during business hours</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Profile",       to: "/profile",       icon: Settings  },
          { label: "Billing",       to: "/billing",       icon: CreditCard },
          { label: "Security",      to: "/security",      icon: Shield    },
          { label: "Notifications", to: "/notifications", icon: Bell      },
          { label: "Referrals",     to: "/referrals",     icon: Users     },
          { label: "PDF Library",   to: "/admin/pdf-import", icon: FileText },
        ].map(item => (
          <Link key={item.label} to={item.to}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

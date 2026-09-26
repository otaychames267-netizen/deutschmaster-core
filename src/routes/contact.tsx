import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, MessageCircle, Clock, ShieldCheck } from "lucide-react";

const SUPPORT_EMAIL = "Support@auralingoviatestdeutsch.academy";
const TELEGRAM_URL = "https://t.me/+21620046880";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — AuraLingovia" },
      { name: "description", content: "Get in touch with the AuraLingovia team by email or Telegram." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Contact Us</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Questions about your account, a subscription, a payment, or the platform in general?
            We're happy to help — reach us through either channel below.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Email support</p>
              <p className="mt-1 text-sm text-muted-foreground break-all">{SUPPORT_EMAIL}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Best for account, billing, and payment questions. We typically respond within 24 hours.
              </p>
            </div>
          </a>

          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <MessageCircle className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Telegram support</p>
              <p className="mt-1 text-sm text-muted-foreground">+216 20 046 880</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Fastest way to reach us directly, especially during business hours.
              </p>
            </div>
          </a>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Response times:</span> most emails and
              Telegram messages are answered within 24 hours. D17 payment verifications are usually
              completed within moments, and within 8 working hours if manual review is needed.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Before you write:</span> for billing or
              refund questions, see our <Link to="/refund" className="underline hover:text-foreground">Refund Policy</Link> — many
              questions are answered there instantly.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          AuraLingovia is an independent TELC B2 exam-preparation platform, operating from Tunisia.
          See our <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>,{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>, and{" "}
          <Link to="/refund" className="underline hover:text-foreground">Refund Policy</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
}

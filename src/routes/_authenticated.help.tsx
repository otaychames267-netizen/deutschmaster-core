import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Mail, MessageSquare, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({ meta: [{ title: "Help & Support — DeutschMaster" }] }),
  component: HelpPage,
});

const FAQ = [
  { q: "How does the 3-day free trial work?", a: "You get full access to your chosen TELC level for 72 hours from registration. No payment required. After day 3, content locks until you upgrade — your progress is always saved." },
  { q: "Can I switch between TELC B1 and B2?", a: "Yes. Use the B1 / B2 toggle at the top of your dashboard, or change it in your profile. Content updates instantly." },
  { q: "What's the difference between Schriftlich and Mündlich?", a: "Schriftlich is the written exam: Lesen (reading), Hören (listening), Sprachbausteine (language elements), and Schreiben (writing). Mündlich is the oral exam: Sprechen (speaking)." },
  { q: "How do I cancel my subscription?", a: "Open Billing in the sidebar to manage or cancel anytime. You keep access until the end of the current period." },
  { q: "Is my progress saved?", a: "Yes. All progress is saved automatically to your account and synced across devices." },
];

function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><LifeBuoy className="h-7 w-7 text-accent" /> Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Find answers fast or reach out — we usually reply within 24 hours.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <HelpCard icon={BookOpen} title="Getting started" desc="Pick your level, complete onboarding, and open Schriftlich or Mündlich." />
        <HelpCard icon={MessageSquare} title="Contact support" desc="Email support@deutschmaster.app — we reply within 24 hours." />
        <HelpCard icon={Mail} title="Feedback" desc="Tell us what's missing — your feedback shapes the roadmap." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently asked questions</CardTitle>
          <CardDescription>The most common questions from TELC learners.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-semibold">Still need help?</p>
            <p className="text-sm text-muted-foreground">Our team is happy to assist with any questions about your prep.</p>
          </div>
          <Button asChild><a href="mailto:support@deutschmaster.app"><Mail className="h-4 w-4 mr-2" /> Contact support</a></Button>
        </CardContent>
      </Card>
    </div>
  );
}

function HelpCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-accent/40">
      <CardContent className="pt-5">
        <Icon className="h-5 w-5 text-accent mb-2" />
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}
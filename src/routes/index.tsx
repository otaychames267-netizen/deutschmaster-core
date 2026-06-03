import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, PenTool, Mic, Award, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DeutschMaster — Professional TELC B1 & B2 Exam Preparation" },
      { name: "description", content: "Master TELC B1 & B2 German exams with structured lessons, exam simulations, AI feedback and 7-language interface." },
      { property: "og:title", content: "DeutschMaster — Professional TELC Preparation" },
      { property: "og:description", content: "Structured lessons, exam simulations, AI feedback. Start your free 3-day trial." },
    ],
  }),
  component: Landing,
});

type Plan = { code: string; name: string; description: string | null; price_eur: number; price_tnd: number; price_usd: number };

function Landing() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const { user } = useAuth();
  useEffect(() => {
    supabase.from("plans").select("code,name,description,price_eur,price_tnd,price_usd").eq("active", true).then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10 -z-10" />
          <div className="container mx-auto px-4 py-20 md:py-28 text-center">
            <Badge variant="secondary" className="mb-4">TELC B1 · B2 · Premium Preparation</Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              {t("hero.title")}
            </h1>
            <p className="mt-4 text-xl md:text-2xl text-muted-foreground">{t("hero.subtitle")}</p>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">{t("hero.description")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild><Link to="/register">{t("hero.cta_trial")}</Link></Button>
              <Button size="lg" variant="outline" asChild><a href="#pricing">{t("hero.cta_plans")}</a></Button>
              <Button size="lg" variant="ghost" asChild><Link to="/login">{t("hero.cta_login")}</Link></Button>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="container mx-auto px-4 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t("features.title")}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { i: BookOpen, k: "reading" }, { i: Headphones, k: "listening" }, { i: PenTool, k: "writing" },
              { i: Mic, k: "speaking" }, { i: Award, k: "certificates" }, { i: Globe2, k: "multi" },
            ].map(({ i: Icon, k }) => (
              <Card key={k} className="border-border/60">
                <CardHeader>
                  <Icon className="h-10 w-10 text-accent mb-2" />
                  <CardTitle>{t(`features.${k}`)}</CardTitle>
                  <CardDescription>{t(`features.${k}_desc`)}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">{t("pricing.title")}</h2>
            <p className="text-center text-muted-foreground mb-12">{t("pricing.trial")}</p>
            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {plans.map((p) => (
                <Card key={p.code} className={p.code === "premium" ? "border-accent shadow-lg relative" : ""}>
                  {p.code === "premium" && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Best value</Badge>}
                  <CardHeader>
                    <CardTitle className="text-2xl">{p.name}</CardTitle>
                    <CardDescription>{p.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{p.price_tnd}</span>
                      <span className="text-muted-foreground"> TND / {t("pricing.monthly")}</span>
                      <div className="text-sm text-muted-foreground mt-1">≈ €{p.price_eur} · ${p.price_usd}</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant={p.code === "premium" ? "default" : "outline"} asChild>
                      <Link to={user ? "/billing" : "/register"}>{t("pricing.choose")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t("testimonials.title")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: "Amira K.", text: "Passed TELC B2 first try. The exam simulations were spot on." },
              { name: "Mehdi B.", text: "The structured lessons and AI feedback made writing finally click." },
              { name: "Sara T.", text: "Best investment for my Ausbildung application. Highly recommend." },
            ].map((x) => (
              <Card key={x.name}>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground italic">"{x.text}"</p>
                  <div className="mt-4 font-medium">— {x.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-muted/30 py-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t("faq.title")}</h2>
            <Accordion type="single" collapsible className="w-full">
              {[
                ["What is the free trial?", "You get 3 days of full access. No payment method required."],
                ["Which exams do you cover?", "TELC B1 and TELC B2 — both written (Schriftlich) and oral (Mündlich)."],
                ["Can I cancel anytime?", "Yes, you can cancel from your billing settings at any time."],
                ["Do you offer refunds?", "Within 7 days of purchase if you haven't consumed substantial content. See our Refund Policy."],
              ].map(([q, a], i) => (
                <AccordionItem key={i} value={`i-${i}`}>
                  <AccordionTrigger>{q}</AccordionTrigger>
                  <AccordionContent>{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="container mx-auto px-4 py-20 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">{t("contact.title")}</h2>
          <ContactForm />
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ContactForm() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("contact_messages").insert({
          name: String(fd.get("name") ?? "").trim(),
          email: String(fd.get("email") ?? "").trim(),
          message: String(fd.get("message") ?? "").trim(),
          user_id: user?.id ?? null,
        });
        setLoading(false);
        if (error) toast.error(error.message);
        else { toast.success(t("contact.sent")); formRef.current?.reset(); }
      }}
    >
      <div><Label htmlFor="name">{t("contact.name")}</Label><Input id="name" name="name" required /></div>
      <div><Label htmlFor="email">{t("contact.email")}</Label><Input id="email" name="email" type="email" required /></div>
      <div><Label htmlFor="message">{t("contact.message")}</Label><Textarea id="message" name="message" required rows={5} /></div>
      <Button type="submit" disabled={loading} className="w-full">{t("contact.send")}</Button>
    </form>
  );
}


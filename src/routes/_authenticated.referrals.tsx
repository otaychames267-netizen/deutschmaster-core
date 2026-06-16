import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Gift, Sparkles, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Freunde einladen — Lingovia" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!user) return;
    const code = user.id.slice(0, 8);
    setLink(`${window.location.origin}/register?ref=${code}`);
  }, [user?.id]);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Einladungslink kopiert");
    setTimeout(() => setCopied(false), 2000);
  };

  const rewards = [
    { tier: "1 Freund", reward: "+3 Tage Trial", icon: Gift },
    { tier: "3 Freunde", reward: "1 Monat Premium gratis", icon: Sparkles },
    { tier: "10 Freunde", reward: "6 Monate Premium gratis", icon: Sparkles },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-accent/15 p-3 text-accent ring-1 ring-accent/30"><UserPlus className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Freunde einladen</h1>
          <p className="text-sm text-muted-foreground">Lade Freunde ein und erhalte Belohnungen für jede erfolgreiche Empfehlung.</p>
        </div>
      </div>

      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Share2 className="h-5 w-5 text-accent" /> Dein persönlicher Einladungslink</CardTitle>
          <CardDescription>Teile diesen Link mit Freunden, die sich auf die TELC-Prüfung vorbereiten.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input readOnly value={link} className="font-mono text-sm" />
            <Button onClick={copy} variant="outline">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">{copied ? "Kopiert" : "Kopieren"}</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Phase 2: Belohnungen werden automatisch nach erfolgreicher Anmeldung deines Freundes aktiviert.</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Gift className="h-4 w-4 text-accent" /> Belohnungen</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {rewards.map((r) => (
            <Card key={r.tier} className="hover:border-accent/50 hover:shadow-md transition">
              <CardContent className="pt-5 space-y-2">
                <div className="rounded-lg bg-accent/15 p-2.5 text-accent w-fit ring-1 ring-accent/30"><r.icon className="h-5 w-5" /></div>
                <Badge variant="outline" className="text-xs">{r.tier}</Badge>
                <p className="font-semibold">{r.reward}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Deine Empfehlungen</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            Du hast noch keine Freunde eingeladen. Teile deinen Link, um zu starten.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
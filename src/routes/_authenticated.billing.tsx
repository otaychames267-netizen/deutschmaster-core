import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — DeutschMaster" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const reload = async () => {
    if (!user) return;
    const [pl, sb, pay, inv] = await Promise.all([
      supabase.from("plans").select("*").eq("active", true).order("price_eur"),
      supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("user_id", user.id).order("issued_at", { ascending: false }),
    ]);
    setPlans(pl.data ?? []); setSub(sb.data); setPayments(pay.data ?? []); setInvoices(inv.data ?? []);
  };
  useEffect(() => { reload(); }, [user]);

  const subscribe = async (planCode: string) => {
    // Stripe Checkout will be wired here once Stripe credentials are added.
    // See PHASE_1_CHECKLIST.md for the required env vars and webhook URL.
    toast.info(`Stripe Checkout for "${planCode}" will be enabled once payment credentials are configured.`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing & Subscription</h1>
      <Card>
        <CardHeader><CardTitle>Current Plan</CardTitle></CardHeader>
        <CardContent>
          {sub ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{sub.plan_code}</p>
                  <p className="text-sm text-muted-foreground">Started {format(new Date(sub.started_at), "PPP")} · Expires {format(new Date(sub.expires_at), "PPP")}</p>
                </div>
                <Badge variant={sub.status === "active" ? "default" : sub.status === "trial" ? "secondary" : "destructive"}>{sub.status}</Badge>
              </div>
              {(sub.status === "trial" || sub.is_trial) && (
                <div className="rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
                  <p className="font-medium">Free trial active</p>
                  <p className="text-muted-foreground">
                    {Math.max(0, differenceInDays(new Date(sub.expires_at), new Date()))} day(s) remaining. Upgrade any time to keep full access.
                  </p>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground">No active subscription.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.code}>
            <CardHeader><CardTitle>{p.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <p className="text-2xl font-bold">{Number(p.price_tnd).toFixed(0)} TND <span className="text-xs text-muted-foreground">/ €{Number(p.price_eur).toFixed(2)}</span></p>
              <Button onClick={() => subscribe(p.code)} className="w-full" disabled={sub?.status === "trial" || sub?.status === "active"}>
                {sub?.status === "trial" || sub?.status === "active" ? "Active plan" : "Subscribe"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : (
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{payments.map((p) => (<TableRow key={p.id}><TableCell>{format(new Date(p.created_at), "PP")}</TableCell><TableCell>{p.amount} {p.currency}</TableCell><TableCell><Badge variant="outline">{p.status}</Badge></TableCell></TableRow>))}</TableBody></Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices yet.</p> : (
            <Table><TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>PDF</TableHead></TableRow></TableHeader>
            <TableBody>{invoices.map((i) => (<TableRow key={i.id}><TableCell>{i.invoice_number}</TableCell><TableCell>{format(new Date(i.issued_at), "PP")}</TableCell><TableCell>{i.amount} {i.currency}</TableCell><TableCell>{i.pdf_url ? <a href={i.pdf_url} className="text-accent">Download</a> : "—"}</TableCell></TableRow>))}</TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
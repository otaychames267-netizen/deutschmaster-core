import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({ meta: [{ title: "Plans — Admin" }] }),
  component: AdminPlans,
});

function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const reload = async () => {
    const { data } = await supabase.from("plans").select("*").order("price_eur");
    setPlans(data ?? []);
  };
  useEffect(() => { reload(); }, []);

  const save = async (p: any) => {
    const { error } = await supabase.from("plans").update({
      name: p.name, description: p.description,
      price_eur: p.price_eur, price_tnd: p.price_tnd, price_usd: p.price_usd, active: p.active,
    }).eq("code", p.code);
    if (error) toast.error(error.message); else toast.success(`Saved ${p.code}`);
  };

  return (
    <div className="space-y-4">
      {plans.map((p, i) => (
        <Card key={p.code}>
          <CardHeader><CardTitle>{p.code}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={p.name} onChange={(e) => { const n=[...plans]; n[i]={...p,name:e.target.value}; setPlans(n); }} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={p.active} onCheckedChange={(v) => { const n=[...plans]; n[i]={...p,active:v}; setPlans(n); }} /><Label>Active</Label></div>
              <div className="md:col-span-2"><Label>Description</Label><Input value={p.description ?? ""} onChange={(e) => { const n=[...plans]; n[i]={...p,description:e.target.value}; setPlans(n); }} /></div>
              <div><Label>Price EUR</Label><Input type="number" step="0.01" value={p.price_eur} onChange={(e) => { const n=[...plans]; n[i]={...p,price_eur:e.target.value}; setPlans(n); }} /></div>
              <div><Label>Price TND</Label><Input type="number" step="0.01" value={p.price_tnd} onChange={(e) => { const n=[...plans]; n[i]={...p,price_tnd:e.target.value}; setPlans(n); }} /></div>
              <div><Label>Price USD</Label><Input type="number" step="0.01" value={p.price_usd} onChange={(e) => { const n=[...plans]; n[i]={...p,price_usd:e.target.value}; setPlans(n); }} /></div>
            </div>
            <Button onClick={() => save(p)}>Save</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
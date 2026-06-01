import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — DeutschMaster" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setSub(data));
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setNotifs(data ?? []));
  }, [user]);

  const remaining = sub?.expires_at ? Math.max(0, differenceInDays(new Date(sub.expires_at), new Date())) : null;
  const examDays = profile?.exam_date ? differenceInDays(new Date(profile.exam_date), new Date()) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name || user?.email}</h1>
        <p className="text-muted-foreground">Here's your learning overview.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Subscription</CardTitle></CardHeader><CardContent>
          {sub ? (<><Badge variant={sub.status === "active" ? "default" : sub.status === "trial" ? "secondary" : "destructive"}>{sub.status}</Badge><p className="text-sm mt-2">{sub.plan_code}</p>{remaining !== null && <p className="text-xs text-muted-foreground mt-1">{remaining} days remaining</p>}</>) : (<><p className="text-sm text-muted-foreground mb-2">No active subscription</p><Button asChild size="sm"><Link to="/billing">Start free trial</Link></Button></>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Current Level</CardTitle></CardHeader><CardContent>
          <p className="text-2xl font-bold">{profile?.level || "—"}</p>
          <p className="text-xs text-muted-foreground">Target: {profile?.target_level || "—"}</p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Exam Countdown</CardTitle></CardHeader><CardContent>
          {profile?.exam_date ? (<><p className="text-2xl font-bold">{examDays} days</p><p className="text-xs text-muted-foreground">{format(new Date(profile.exam_date), "PPP")}</p></>) : (<p className="text-sm text-muted-foreground">Set exam date in <Link to="/profile" className="text-accent">profile</Link></p>)}
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {notifs.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> :
            notifs.map((n) => (
              <div key={n.id} className="flex justify-between border-b pb-2 last:border-0">
                <div><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></div>
                <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d")}</span>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
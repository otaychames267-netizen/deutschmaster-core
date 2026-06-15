import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Lingovia" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [p, setP] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [resending, setResending] = useState(false);
  const emailVerified = !!user?.email_confirmed_at;

  const loadMfa = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaEnrolled(!!data?.totp?.find((f) => f.status === "verified"));
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setP(data));
    loadMfa();
  }, [user]);

  if (!p) return <p className="text-muted-foreground">Loading...</p>;

  const save = async () => {
    if (p.level && p.level !== "TELC_B1" && p.level !== "TELC_B2") {
      return toast.error("Please pick a valid level");
    }
    // confirm if level changed
    const { data: current } = await supabase.from("profiles").select("level").eq("id", user!.id).maybeSingle();
    if (current?.level && p.level && current.level !== p.level) {
      const ok = window.confirm(
        `Switch your preparation from ${current.level.replace("_"," ")} to ${p.level.replace("_"," ")}? All content (exercises, models, dashboard) will reload for the new level.`
      );
      if (!ok) return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: p.full_name, country: p.country, level: p.level, target_level: p.target_level,
      exam_date: p.exam_date || null, study_goal: p.study_goal,
    }).eq("id", user!.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved successfully");
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password"));
    if (pw.length < 8) return toast.error("Min 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message); else { toast.success("Password updated successfully"); form.reset(); }
  };

  const resendVerification = async () => {
    if (!user?.email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent. Please check your inbox.");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>Email verification</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {emailVerified ? (
              <><CheckCircle2 className="h-5 w-5 text-green-600" /><Badge variant="default">Verified</Badge></>
            ) : (
              <><AlertCircle className="h-5 w-5 text-amber-500" /><Badge variant="destructive">Not verified</Badge></>
            )}
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </div>
          {!emailVerified && (
            <Button size="sm" variant="outline" onClick={resendVerification} disabled={resending}>
              {resending ? "Sending…" : "Resend verification email"}
            </Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Full name</Label><Input value={p.full_name ?? ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={p.email ?? ""} disabled /></div>
            <div><Label>Country</Label><Input value={p.country ?? ""} onChange={(e) => setP({ ...p, country: e.target.value })} /></div>
            <div><Label>Current level</Label>
              <Select value={p.level ?? ""} onValueChange={(v) => setP({ ...p, level: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELC_B1">TELC B1</SelectItem>
                  <SelectItem value="TELC_B2">TELC B2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Target level</Label>
              <Select value={p.target_level ?? ""} onValueChange={(v) => setP({ ...p, target_level: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELC_B1">TELC B1</SelectItem>
                  <SelectItem value="TELC_B2">TELC B2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Exam date</Label><Input type="date" value={p.exam_date ?? ""} onChange={(e) => setP({ ...p, exam_date: e.target.value })} /></div>
          </div>
          <div><Label>Study goal</Label><Input value={p.study_goal ?? ""} onChange={(e) => setP({ ...p, study_goal: e.target.value })} /></div>
          <Button onClick={save} disabled={saving}>Save changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Two-Factor Authentication</CardTitle></CardHeader>
        <CardContent>
          <TwoFactorSetup enrolled={mfaEnrolled} onChange={loadMfa} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="flex gap-2 max-w-md">
            <Input name="password" type="password" placeholder="New password" required minLength={8} />
            <Button type="submit">Update</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
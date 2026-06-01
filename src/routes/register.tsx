import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accept, setAccept] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>{t("auth.sign_up")}</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mb-4" onClick={async () => {
              await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
            }}>{t("auth.continue_google")}</Button>
            <div className="text-center text-sm text-muted-foreground my-2">{t("auth.or")}</div>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              if (!accept) { toast.error("Please accept the terms."); return; }
              setLoading(true);
              const fd = new FormData(e.currentTarget);
              const { error } = await supabase.auth.signUp({
                email: String(fd.get("email")),
                password: String(fd.get("password")),
                options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: String(fd.get("full_name")) } },
              });
              setLoading(false);
              if (error) toast.error(error.message);
              else { toast.success(t("auth.verify_email")); navigate({ to: "/dashboard" }); }
            }}>
              <div><Label>{t("auth.full_name")}</Label><Input name="full_name" required /></div>
              <div><Label>{t("auth.email")}</Label><Input name="email" type="email" required /></div>
              <div><Label>{t("auth.password")}</Label><Input name="password" type="password" required minLength={8} /></div>
              <div className="flex items-center gap-2"><Checkbox id="a" checked={accept} onCheckedChange={(v) => setAccept(!!v)} /><Label htmlFor="a" className="text-sm">{t("auth.accept_terms")}</Label></div>
              <Button type="submit" disabled={loading} className="w-full">{t("auth.sign_up")}</Button>
            </form>
            <div className="mt-4 text-sm text-center"><Link to="/login" className="text-accent">{t("auth.sign_in")}</Link></div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
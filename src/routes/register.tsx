import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accept, setAccept] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const redirectStarted = useRef(false);

  const redirectToOnboarding = (message = "Account created successfully — redirecting to setup.") => {
    if (redirectStarted.current) return;
    redirectStarted.current = true;
    setLoading(true);
    setSuccessMessage(message);
    toast.success(message);
    window.setTimeout(() => {
      window.location.assign("/onboarding");
    }, 400);
  };

  useEffect(() => {
    if (!authLoading && user) {
      redirectToOnboarding();
    }
  }, [authLoading, user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Back to home</Link>
            <CardTitle>{t("auth.sign_up")}</CardTitle>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <div className="mb-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-foreground">
                {successMessage}
              </div>
            )}
            <Button variant="outline" className="w-full mb-4" onClick={async () => {
              await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
            }}>{t("auth.continue_google")}</Button>
            <div className="text-center text-sm text-muted-foreground my-2">{t("auth.or")}</div>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              if (!accept) { toast.error("Please accept the terms."); return; }
              setLoading(true);
              const fd = new FormData(e.currentTarget);
              const { data, error } = await supabase.auth.signUp({
                email: String(fd.get("email")),
                password: String(fd.get("password")),
                options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: String(fd.get("full_name")) } },
              });
              if (error) { setLoading(false); toast.error(error.message); return; }
              if (data.session) {
                const { data: restored } = await supabase.auth.getSession();
                if (restored.session) redirectToOnboarding();
                else { setLoading(false); toast.error("Account created, but the session was not restored. Please sign in."); }
              } else {
                setLoading(false);
                toast.success("Account created. Please check your email to confirm your address, then sign in.");
                navigate({ to: "/login", replace: true });
              }
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
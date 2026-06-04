import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — DeutschMaster" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const redirectStarted = useRef(false);

  const redirectToDashboard = (message = "Login successful — redirecting to your dashboard.") => {
    if (redirectStarted.current) return;
    redirectStarted.current = true;
    setLoading(true);
    setSuccessMessage(message);
    toast.success(message);

    window.setTimeout(() => {
      navigate({ to: "/dashboard", replace: true });
      window.setTimeout(() => {
        if (window.location.pathname !== "/dashboard") {
          window.location.replace(new URL("/dashboard", window.location.origin).toString());
        }
      }, 250);
    }, 700);
  };

  useEffect(() => {
    if (!authLoading && user) {
      redirectToDashboard();
    }
  }, [authLoading, user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Back to home</Link>
            <CardTitle>{t("auth.sign_in")}</CardTitle>
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
              setLoading(true);
              const fd = new FormData(e.currentTarget);
              const { data, error } = await supabase.auth.signInWithPassword({ email: String(fd.get("email")), password: String(fd.get("password")) });
              if (error) { setLoading(false); toast.error(error.message); return; }
              const { data: restored } = await supabase.auth.getSession();
              if (data.session || restored.session) redirectToDashboard();
              else { setLoading(false); toast.error("Login succeeded, but the session was not restored. Please try again."); }
            }}>
              <div><Label>{t("auth.email")}</Label><Input name="email" type="email" required /></div>
              <div><Label>{t("auth.password")}</Label><Input name="password" type="password" required /></div>
              <Button type="submit" disabled={loading} className="w-full">{t("auth.sign_in")}</Button>
            </form>
            <div className="mt-4 flex justify-between text-sm">
              <Link to="/forgot-password" className="text-accent">{t("auth.forgot")}</Link>
              <Link to="/register" className="text-accent">{t("auth.sign_up")}</Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

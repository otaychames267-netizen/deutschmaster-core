import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — Lingovia" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Back to login</Link>
            <CardTitle>{t("auth.forgot")}</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Check your inbox for a reset link. The link will take you straight to a page where you can set a new password.</p>
                <p className="text-xs text-muted-foreground">Didn't receive it? Check spam or try again in a minute.</p>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                const fd = new FormData(e.currentTarget);
                const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                setLoading(false);
                if (error) toast.error(error.message);
                else setSent(true);
              }}>
                <div><Label>{t("auth.email")}</Label><Input name="email" type="email" required /></div>
                <Button type="submit" disabled={loading} className="w-full">{t("auth.reset_link")}</Button>
              </form>
            )}
            <div className="mt-4 text-sm"><Link to="/login" className="text-accent">← {t("auth.sign_in")}</Link></div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
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

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — DeutschMaster" }] }),
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
          <CardHeader><CardTitle>{t("auth.forgot")}</CardTitle></CardHeader>
          <CardContent>
            {sent ? (
              <p className="text-sm text-muted-foreground">Check your inbox for a reset link.</p>
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
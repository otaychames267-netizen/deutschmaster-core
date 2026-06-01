import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — DeutschMaster" }] }),
  component: ResetPage,
});

function ResetPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>{t("auth.reset")}</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const pw = String(fd.get("password"));
              if (pw.length < 8) return toast.error("Password must be at least 8 characters");
              setLoading(true);
              const { error } = await supabase.auth.updateUser({ password: pw });
              setLoading(false);
              if (error) toast.error(error.message);
              else { toast.success("Password updated"); nav({ to: "/dashboard" }); }
            }}>
              <div><Label>{t("auth.new_password")}</Label><Input name="password" type="password" required minLength={8} /></div>
              <Button type="submit" disabled={loading} className="w-full">{t("auth.reset")}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
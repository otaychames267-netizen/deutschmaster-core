import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  enrolled: boolean;
  onChange: () => void;
}

/** Real TOTP enrollment using Supabase Auth MFA (works with Google Authenticator, 1Password, Authy). */
export function TwoFactorSetup({ enrolled, onChange }: Props) {
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "AuraLingovia" });
    if (error) { toast.error(error.message); setEnrolling(false); return; }
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const verifyEnroll = async () => {
    if (!factorId) return;
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr) { toast.error(chErr.message); setBusy(false); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
    setBusy(false);
    if (vErr) { toast.error(vErr.message); return; }
    toast.success("Two-factor authentication enabled");
    setEnrolling(false); setQr(null); setSecret(null); setFactorId(null); setCode("");
    onChange();
  };

  const disable = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.[0];
    if (!totp) { onChange(); return; }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id });
    if (error) toast.error(error.message);
    else { toast.success("Two-factor authentication disabled"); onChange(); }
  };

  if (enrolled) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">TOTP is active on your account.</p>
        <Button variant="outline" onClick={disable}>Disable 2FA</Button>
      </div>
    );
  }

  if (!enrolling) {
    return <Button onClick={startEnroll}>Enable 2FA</Button>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">1. Scan this QR code with Google Authenticator, 1Password, or Authy.</p>
      {qr && <img src={qr} alt="2FA QR" className="border rounded bg-white p-2" width={180} height={180} />}
      {secret && <p className="text-xs text-muted-foreground break-all">Or enter manually: <code className="bg-muted px-1 rounded">{secret}</code></p>}
      <p className="text-sm">2. Enter the 6-digit code from your app:</p>
      <div className="flex gap-2 max-w-xs">
        <Label className="sr-only">Code</Label>
        <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" />
        <Button onClick={verifyEnroll} disabled={busy || code.length !== 6}>Verify</Button>
      </div>
      <Button variant="ghost" size="sm" onClick={() => { setEnrolling(false); setQr(null); setFactorId(null); }}>Cancel</Button>
    </div>
  );
}
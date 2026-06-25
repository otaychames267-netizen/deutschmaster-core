import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Key, LogOut, Eye, EyeOff,
  CheckCircle2, AlertCircle, Loader2, Lock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const { user, signOut } = useAuth();

  /* Change password */
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPw]   = useState("");
  const [showPw, setShowPw]               = useState(false);
  const [pwLoading, setPwLoading]         = useState(false);

  /* Change email */
  const [newEmail, setNewEmail]           = useState("");
  const [emailLoading, setEmailLoading]   = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully.");
      setNewPassword("");
      setConfirmPw("");
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Verification email sent. Check your inbox to confirm the change.");
      setNewEmail("");
    }
  }

  async function handleSignOutAll() {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) toast.error("Failed to sign out all sessions.");
    else {
      toast.success("Signed out from all devices.");
      signOut();
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Security Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your password, email, and active sessions.</p>
      </div>

      {/* Current email */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <p className="font-semibold text-foreground">Account info</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Current account email</p>
          </div>
          {user?.email_confirmed_at && (
            <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
          )}
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-muted-foreground" />
          <p className="font-semibold text-foreground">Change password</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">New password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Confirm new password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
              />
            </div>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <div className="flex items-center gap-2 text-xs text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" /> Passwords do not match
            </div>
          )}
          {newPassword && newPassword.length < 8 && (
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <AlertCircle className="h-3.5 w-3.5" /> At least 8 characters required
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={pwLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
          Update password
        </button>
      </form>

      {/* Change email */}
      <form onSubmit={handleChangeEmail} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <p className="font-semibold text-foreground">Change email</p>
        </div>

        <p className="text-sm text-muted-foreground">
          A verification link will be sent to the new address. Your email won't change until you confirm.
        </p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">New email address</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={emailLoading || !newEmail}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Send verification
        </button>
      </form>

      {/* Sign out all devices */}
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <LogOut className="h-5 w-5 text-rose-500" />
          <p className="font-semibold text-foreground">Sign out all devices</p>
        </div>
        <p className="text-sm text-muted-foreground">
          This will immediately end all active sessions across every device, including this one.
          You will be redirected to the login page.
        </p>
        <button
          onClick={handleSignOutAll}
          className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-500/20 dark:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out all devices
        </button>
      </div>
    </div>
  );
}

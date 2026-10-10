import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { ShieldOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useContentProtection } from "@/hooks/useContentProtection";
import { getContentAccessGate, pingContentAccess } from "@/lib/content-protection/protection.functions";
import { Watermark } from "./Watermark";
import { LegalNotice } from "./LegalNotice";

interface GateState {
  checked: boolean;
  locked: boolean;
  suspendedUntil: string | null;
}

/**
 * Wraps every protected exercise route (Lesen/Hören/Sprachbausteine/
 * Schreiben vorbereitung + the Prüfung simulation). Three jobs:
 *  1. Check + enforce the content-protection suspension gate (independent
 *     of subscription status — a suspended account is blocked here even if
 *     it has an active plan).
 *  2. Report a behavioral pace signal per page visited (pingContentAccess).
 *  3. Apply the DOM deterrents (useContentProtection), the watermark, and
 *     the legal notice.
 */
export function ProtectedContentGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [gate, setGate] = useState<GateState>({ checked: false, locked: false, suspendedUntil: null });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Guests have no account to suspend — treat the gate as immediately
    // checked/unlocked rather than hanging on the loading spinner forever
    // (the effect below that would normally flip `checked` never runs
    // without a user).
    if (!user) { setGate({ checked: true, locked: false, suspendedUntil: null }); return; }
    getContentAccessGate().then((res) => {
      if (!mountedRef.current) return;
      setGate({ checked: true, locked: res.accountLocked, suspendedUntil: res.suspendedUntil });
    }).catch(() => {
      if (mountedRef.current) setGate((g) => ({ ...g, checked: true }));
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user || !gate.checked || gate.locked) return;
    pingContentAccess({ data: { route: location.pathname } }).then((res) => {
      if (res.locked && mountedRef.current) {
        setGate((g) => ({ ...g, locked: true }));
      }
    }).catch(() => { /* best-effort */ });
  }, [user?.id, location.pathname, gate.checked, gate.locked]);

  useContentProtection(gate.checked && !gate.locked);

  if (!gate.checked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (gate.locked) {
    return <SuspendedScreen suspendedUntil={gate.suspendedUntil} />;
  }

  return (
    <div className="select-none" translate="no">
      <div className="print-protection-notice">Printing is disabled — AuraLingovia content is protected.</div>
      <div className="protected-content">
        <LegalNotice />
        {children}
      </div>
      <Watermark label={user?.email ?? user?.id ?? ""} />
    </div>
  );
}

function SuspendedScreen({ suspendedUntil }: { suspendedUntil: string | null }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldOff className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Content access temporarily suspended</h2>
      <p className="text-sm text-muted-foreground">
        This account has been temporarily suspended from accessing exercise content due to unusual activity
        detected on our platform.
        {suspendedUntil && (
          <> Access is scheduled to resume automatically on {new Date(suspendedUntil).toLocaleString()}.</>
        )}
        {" "}If you believe this is a mistake, please contact support.
      </p>
    </div>
  );
}

/**
 * Fixed floating WhatsApp contact button, visible on every authenticated page.
 * Reuses the same admin-configurable number as the header icon
 * (Admin Settings → General → whatsapp_contact_number) — renders nothing until
 * a number is actually set. z-40 so it stays below modals/sheets (z-50) and
 * never blocks them; bottom-right with safe-area margin so it never overlaps
 * the sidebar toggle or other fixed UI.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.76.46 3.45 1.34 4.95L2 22l5.2-1.36a9.96 9.96 0 0 0 4.84 1.24h.01c5.52 0 10-4.48 10-10s-4.49-9.88-10.01-9.88Zm5.86 14.2c-.25.7-1.45 1.34-2 1.43-.51.08-1.15.11-1.86-.12-.43-.13-.98-.32-1.68-.62-2.96-1.28-4.89-4.26-5.04-4.46-.15-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.59-.37.78-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.6.84 2.07.91 2.22.08.15.13.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.44.53-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.77.83 2.07.98.3.15.5.22.58.35.07.13.07.75-.18 1.45Z" />
    </svg>
  );
}

export function FloatingWhatsAppButton() {
  const { user } = useAuth();
  const [number, setNumber] = useState<string | null>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("get_platform_setting", { p_key: "whatsapp_contact_number" })
      .then(({ data }) => setNumber((data as string | null) ?? null));
  }, [user?.id]);

  if (!user || !number) return null;

  return (
    <a
      href={`https://wa.me/${number.replace(/^\+/, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] py-3 pl-3 pr-3 text-white shadow-lg shadow-black/20 transition-all duration-300 hover:pr-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
      aria-label="Auf WhatsApp kontaktieren"
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-[#25D366] opacity-75 animate-ping [animation-duration:2.5s] group-hover:hidden" />
      <WhatsAppIcon className="h-6 w-6 shrink-0" />
      <span
        className={`overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ${
          hover ? "max-w-[10rem] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        WhatsApp
      </span>
    </a>
  );
}

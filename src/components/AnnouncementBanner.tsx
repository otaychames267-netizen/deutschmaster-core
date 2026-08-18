/**
 * Premium dashboard notification banner — shows the single most recent,
 * still-active admin announcement (server-side filtered: RLS only returns
 * rows where expires_at > now(), so refresh/logout-login/another device all
 * see the same, correct state without any frontend timer deciding when to
 * hide it). Renders nothing at all if there's no active announcement —
 * never a placeholder or empty card.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  message: string;
  published_at: string;
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await (supabase as any)
        .from("dashboard_announcements")
        .select("id, message, published_at")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setAnnouncement(data ?? null);
    }
    load();
    // Re-check periodically so a banner that expires mid-session disappears
    // without needing a manual reload, and a newly-published one appears.
    const interval = setInterval(load, 5 * 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <AnimatePresence>
      {announcement && (
        <motion.div
          key={announcement.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5 sm:px-5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Megaphone className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold text-foreground">Neue Mitteilung</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
              {announcement.message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

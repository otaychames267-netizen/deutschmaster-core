/**
 * Dashboard prompt: "When is your exam?" — only 5 of ~1,300 students had ever set `profiles.exam_date`, so the countdown pill
 * and the exam-aware subscription messaging on the dashboard were effectively dead. Writes the student's OWN profile row
 * (existing column, existing RLS). Hidden once a future date is set; "Not now" mutes it for a week.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const MUTE_KEY = "exam-date-card-muted-at";
const MUTE_DAYS = 7;

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function isMuted(): boolean {
  try {
    const at = Number(localStorage.getItem(MUTE_KEY));
    return at > 0 && Date.now() - at < MUTE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function ExamDateCard({ userId, examDate, onSaved }: { userId: string; examDate: string | null; onSaved: (date: string) => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  // Start muted and read storage in an effect: no hydration mismatch, no flash for people who already muted it.
  const [muted, setMuted] = useState(true);
  useEffect(() => { setMuted(isMuted()); }, []);

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const farthest = new Date(); farthest.setFullYear(farthest.getFullYear() + 2);
  const min = isoDate(tomorrow);
  const hasFutureDate = !!examDate && examDate >= min;

  if (hasFutureDate || muted) return null;

  const save = async () => {
    if (!value || value < min || value > isoDate(farthest)) { toast.error(t("examDate.invalid")); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ exam_date: value }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error(t("examDate.error")); return; }
    toast.success(t("examDate.saved"));
    onSaved(value);
  };

  return (
    <section aria-label={t("examDate.title")} className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/8 to-card p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/20">
          <CalendarDays className="h-5 w-5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p dir="auto" className="text-sm font-black text-foreground">{t("examDate.title")}</p>
          <p dir="auto" className="text-xs text-muted-foreground">{t("examDate.desc")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={value}
          min={min}
          max={isoDate(farthest)}
          onChange={(e) => setValue(e.target.value)}
          aria-label={t("examDate.title")}
          className="h-9 w-auto min-w-[9.5rem]"
        />
        <Button size="sm" onClick={save} disabled={!value || saving}>{t("examDate.save")}</Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { try { localStorage.setItem(MUTE_KEY, String(Date.now())); } catch { /* private mode: it just comes back next visit */ } setMuted(true); }}
        >
          {t("examDate.later")}
        </Button>
      </div>
    </section>
  );
}

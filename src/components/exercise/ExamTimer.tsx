import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

export function ExamTimer({ endsAt, onExpire }: { endsAt: string; onExpire?: () => void }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, end - now);
  useEffect(() => {
    if (remaining === 0 && onExpire) onExpire();
  }, [remaining, onExpire]);
  const total = Math.floor(remaining / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const warn = remaining < 5 * 60 * 1000;
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm tabular-nums ${warn ? "border-red-500 text-red-600" : ""}`}>
      <Clock3 className="size-3.5" />
      {h > 0 ? `${h}:` : ""}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}
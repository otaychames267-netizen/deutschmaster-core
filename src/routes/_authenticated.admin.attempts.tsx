import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/attempts")({
  head: () => ({ meta: [{ title: "Open Answers — Admin" }] }),
  component: AdminAttempts,
});

type Row = {
  id: string; user_id: string; exercise_id: string; answer: any;
  score: number | null; needs_review: boolean; completed_at: string;
  exercises: { title: string; module: string; teil: number } | null;
};

function AdminAttempts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [grade, setGrade] = useState<Record<string, string>>({});

  const reload = async () => {
    const { data, error } = await supabase
      .from("user_exercise_attempts")
      .select("id,user_id,exercise_id,answer,score,needs_review,completed_at,exercises:exercise_id(title,module,teil)")
      .eq("needs_review", true)
      .order("completed_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
  };
  useEffect(() => { reload(); }, []);

  const save = async (id: string) => {
    const s = parseInt(grade[id] ?? "0", 10);
    if (Number.isNaN(s) || s < 0 || s > 100) { toast.error("Score muss 0–100 sein"); return; }
    const { error } = await supabase
      .from("user_exercise_attempts")
      .update({ score: s, is_correct: s >= 60, needs_review: false })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Bewertet"); reload(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open answers awaiting review ({rows.length})</CardTitle>
        <CardDescription>Schreiben & Mündlich Antworten, die noch bewertet werden müssen.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-28">Score</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Keine offenen Antworten.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">{r.exercises?.title ?? "—"}</div>
                    <div className="text-xs text-muted-foreground capitalize">{r.exercises?.module} · Teil {r.exercises?.teil}</div>
                  </TableCell>
                  <TableCell className="align-top max-w-[420px]">
                    <pre className="whitespace-pre-wrap text-xs">{typeof r.answer === "string" ? r.answer : JSON.stringify(r.answer, null, 2)}</pre>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground align-top">{new Date(r.completed_at).toLocaleDateString()}</TableCell>
                  <TableCell className="align-top">
                    <Input type="number" min={0} max={100} value={grade[r.id] ?? ""} onChange={(e) => setGrade((g) => ({ ...g, [r.id]: e.target.value }))} />
                  </TableCell>
                  <TableCell className="align-top"><Button size="sm" onClick={() => save(r.id)}>Save</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
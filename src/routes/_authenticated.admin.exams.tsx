import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/exams")({
  component: () => <ComingSoon title="Admin — Exam Management" description="Full exam management, content approval, and answer key review is coming in Phase 2." />,
});

import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
        <Construction className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description ?? "This section is being built. Check back soon — it will be ready in the next phase."}
      </p>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "403 — Access Denied" }] }),
  component: () => (<div className="min-h-screen flex items-center justify-center px-4 text-center"><div><h1 className="text-7xl font-bold">403</h1><p className="mt-2 text-muted-foreground">You don't have permission to view this page.</p><Link to="/" className="mt-6 inline-block text-accent">Go home</Link></div></div>),
});

import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
export const Route = createFileRoute("/refund")({
  head: () => ({ meta: [{ title: "Refund Policy — Lingovia" }, { name: "description", content: "Refund policy." }] }),
  component: () => (<div className="min-h-screen flex flex-col"><Header /><main className="container mx-auto max-w-3xl px-4 py-12 prose dark:prose-invert"><h1>Refund Policy</h1><p>A 3-day free trial is included. Refunds available within 7 days if no premium content accessed.</p></main><Footer /></div>),
});

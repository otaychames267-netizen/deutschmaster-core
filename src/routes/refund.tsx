import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
export const Route = createFileRoute("/refund")({
  head: () => ({ meta: [{ title: "Refund Policy — AuraLingovia" }, { name: "description", content: "AuraLingovia refund policy." }] }),
  component: () => (<div className="min-h-screen flex flex-col"><Header /><main className="container mx-auto max-w-3xl px-4 py-12 prose dark:prose-invert"><h1>Refund Policy</h1><p>Refunds available within 7 days of purchase if no premium content has been accessed. Contact support to request a refund.</p></main><Footer /></div>),
});

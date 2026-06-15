import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — Lingovia" }, { name: "description", content: "Lingovia terms." }] }),
  component: () => (<div className="min-h-screen flex flex-col"><Header /><main className="container mx-auto max-w-3xl px-4 py-12 prose dark:prose-invert"><h1>Terms of Service</h1><p>By using Lingovia you agree to these terms. Subscriptions renew until cancelled.</p></main><Footer /></div>),
});

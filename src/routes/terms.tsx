import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — DeutschMaster" }, { name: "description", content: "DeutschMaster terms." }] }),
  component: () => (<div className="min-h-screen flex flex-col"><Header /><main className="container mx-auto max-w-3xl px-4 py-12 prose dark:prose-invert"><h1>Terms of Service</h1><p>By using DeutschMaster you agree to these terms. Subscriptions renew until cancelled.</p></main><Footer /></div>),
});

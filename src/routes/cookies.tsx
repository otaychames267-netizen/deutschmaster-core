import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy — DeutschMaster" }, { name: "description", content: "Cookie usage." }] }),
  component: () => (<div className="min-h-screen flex flex-col"><Header /><main className="container mx-auto max-w-3xl px-4 py-12 prose dark:prose-invert"><h1>Cookie Policy</h1><p>We use essential cookies for authentication plus analytics cookies to improve the service.</p></main><Footer /></div>),
});

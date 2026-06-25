import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — AuraLingovia" }, { name: "description", content: "How AuraLingovia handles your data." }] }),
  component: () => (<div className="min-h-screen flex flex-col"><Header /><main className="container mx-auto max-w-3xl px-4 py-12 prose dark:prose-invert"><h1>Privacy Policy</h1><p>We respect your privacy. Account info, profile data, usage analytics and payment metadata are processed to deliver our services under GDPR.</p></main><Footer /></div>),
});

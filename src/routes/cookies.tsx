import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const LAST_UPDATED = "July 22, 2026";
const SUPPORT_EMAIL = "Support@auralingoviatestdeutsch.academy";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — AuraLingovia" },
      { name: "description", content: "How AuraLingovia uses cookies and similar technologies." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cookie Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed">
          <p>
            This Cookie Policy explains how AuraLingovia uses cookies and similar technologies (such as
            browser local storage) when you visit our website or use our app. It supplements our{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>1. What Are Cookies?</h2>
          <p>
            Cookies are small text files placed on your device when you visit a website. We also use
            browser local storage, which serves a similar purpose but is not sent with every network
            request.
          </p>

          <h2>2. Types of Cookies We Use</h2>
          <ul>
            <li><strong>Essential (strictly necessary)</strong> — keep you signed in and secure your session. The Service will not work correctly without these; they cannot be turned off.</li>
            <li><strong>Preference</strong> — remember your interface language, light/dark theme, and similar settings, stored in local storage on your device.</li>
            <li><strong>Analytics</strong> — help us understand how the Service is used (for example, which pages are visited) so we can improve it. Where required by law, these are only set with your consent.</li>
          </ul>
          <p>We do not use third-party advertising cookies.</p>

          <h2>3. Managing Cookies</h2>
          <p>
            Most browsers let you block or delete cookies through their settings. Blocking essential
            cookies will prevent you from staying signed in to AuraLingovia. You can also clear your
            browser's local storage at any time, which will reset your saved preferences.
          </p>

          <h2>4. Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time. We will post changes here with a new
            "Last updated" date.
          </p>

          <h2>5. Contact</h2>
          <p>
            Questions about this policy? Contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or via our{" "}
            <Link to="/contact">Contact page</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const LAST_UPDATED = "July 22, 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — AuraLingovia" },
      { name: "description", content: "How AuraLingovia collects, uses, and protects your personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed">
          <p>
            This Privacy Policy explains what personal data AuraLingovia ("we", "us", "our") collects
            when you use our TELC B2 exam preparation platform, why we collect it, who we share it with,
            and the choices and rights you have. It should be read together with our{" "}
            <Link to="/terms">Terms of Service</Link> and <Link to="/cookies">Cookie Policy</Link>.
          </p>

          <h2>1. Information We Collect</h2>
          <p><strong>Account &amp; profile data</strong> — your name, email address, password (stored as a
          salted hash, never in plain text), preferred exam level, target level, and interface language.</p>
          <p><strong>Usage &amp; learning data</strong> — exercises you complete, answers you submit,
          scores, study streaks, XP/achievements, and essays or spoken responses you submit for AI-assisted
          feedback.</p>
          <p><strong>Payment-related data</strong> — for D17 Mobile Transfer, the payment confirmation
          screenshot(s) you upload and metadata we derive from them (amount, reference, timestamp) to
          verify your payment; for Lemon Squeezy card payments, only high-level order and subscription
          metadata (plan, status, renewal date) — your full card number is entered directly into Lemon
          Squeezy's payment page and never reaches our servers.</p>
          <p><strong>Device &amp; security data</strong> — IP address, a device fingerprint, and basic
          device/browser information, used to secure accounts and to detect fraudulent or duplicate
          payment attempts.</p>
          <p><strong>Communications</strong> — messages you send us via email or Telegram support, and
          records of notifications we send you.</p>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To create and operate your account and deliver the exercises, exam simulations, and feedback you request;</li>
            <li>To verify payments, activate and manage subscriptions, and prevent payment fraud;</li>
            <li>To generate AI-assisted feedback on writing and (where enabled) spoken responses;</li>
            <li>To send you service communications — payment confirmations, subscription status, security alerts — and, where you have not opted out, occasional product updates;</li>
            <li>To maintain the security, integrity, and reliability of the Service, including detecting abuse; and</li>
            <li>To comply with legal obligations.</li>
          </ul>

          <h2>3. Legal Basis for Processing</h2>
          <p>
            Where applicable data-protection law (such as the EU/UK GDPR) requires a legal basis, we rely
            on: performance of our contract with you (delivering the Service you signed up for), our
            legitimate interests (security, fraud prevention, improving the Service), and your consent
            where we ask for it (for example, optional marketing communications or non-essential cookies).
          </p>

          <h2>4. Who We Share Data With</h2>
          <p>We do not sell your personal data. We share it only with service providers who help us run AuraLingovia, under contractual confidentiality obligations:</p>
          <ul>
            <li><strong>Supabase</strong> — our database, authentication, and file-storage provider (EU-hosted infrastructure), which stores your account, learning, and payment-metadata records;</li>
            <li><strong>Anthropic (Claude) and Google (Gemini)</strong> — AI providers used to grade written essays and, where enabled, evaluate spoken exam responses. Only the specific submission being graded is sent, solely to generate your feedback;</li>
            <li><strong>Lemon Squeezy</strong> — our card-payment processor and merchant of record, once card payments are active; they receive the billing details needed to process your payment directly;</li>
            <li><strong>Email and Telegram</strong> — used to deliver account, payment, and support notifications you trigger or that relate to your account; and</li>
            <li>Law enforcement or regulators, where we are legally required to disclose information.</li>
          </ul>

          <h2>5. International Data Transfers</h2>
          <p>
            Our core infrastructure is hosted in the EU. Some service providers we use (including our AI
            processors) are based in the United States. Where personal data is transferred outside your
            country, we rely on the transfer mechanisms those providers make available (such as standard
            contractual clauses) to protect it.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We keep your account and learning data for as long as your account is active, so you keep
            access to your history and progress. If you close your account, we delete or anonymize
            personal data within a reasonable period, except where we must retain records (for example,
            payment records) to meet legal, tax, or fraud-prevention obligations.
          </p>

          <h2>7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you;</li>
            <li>Correct inaccurate data (most profile fields can also be edited directly in your account settings);</li>
            <li>Request deletion of your data, subject to the retention exceptions above;</li>
            <li>Request an export of your data in a portable format;</li>
            <li>Object to or restrict certain processing, and withdraw consent where processing is based on consent; and</li>
            <li>Lodge a complaint with your local data-protection authority.</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href="mailto:Support@auralingoviatestdeutsch.academy">Support@auralingoviatestdeutsch.academy</a>. We will respond within a reasonable timeframe, generally within 30 days.</p>

          <h2>8. Cookies &amp; Similar Technologies</h2>
          <p>
            We use cookies and local storage for authentication, remembering your language/theme
            preference, and basic analytics. See our full <Link to="/cookies">Cookie Policy</Link> for
            details and how to control them.
          </p>

          <h2>9. Data Security</h2>
          <p>
            We use industry-standard measures to protect your data, including encryption in transit
            (HTTPS), Row-Level Security so accounts can only ever read their own records, and hashed
            (never plain-text) password storage via our authentication provider. No method of transmission
            or storage is 100% secure, but we work to keep your data protected and to respond quickly if
            an issue is identified.
          </p>

          <h2>10. Children's Privacy</h2>
          <p>
            The Service is not directed at children under 16. We do not knowingly collect personal data
            from children under 16. If you believe a child has provided us with personal data, contact us
            and we will delete it.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post changes here with a new
            "Last updated" date, and for material changes we will make reasonable efforts to notify you
            directly.
          </p>

          <h2>12. Contact</h2>
          <p>
            Questions or requests about your data? Contact our team at{" "}
            <a href="mailto:Support@auralingoviatestdeutsch.academy">Support@auralingoviatestdeutsch.academy</a> or via our{" "}
            <Link to="/contact">Contact page</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

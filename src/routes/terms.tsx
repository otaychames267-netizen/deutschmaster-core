import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const LAST_UPDATED = "July 22, 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — AuraLingovia" },
      { name: "description", content: "The terms that govern your use of AuraLingovia's TELC B2 exam preparation platform, including subscriptions, billing, and acceptable use." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed">
          <p>
            These Terms of Service ("Terms") form a binding agreement between you and AuraLingovia
            ("AuraLingovia", "we", "us", "our") governing your access to and use of the AuraLingovia
            website, applications, and TELC B2 German exam preparation services (collectively, the
            "Service"). By creating an account or otherwise using the Service, you agree to these Terms.
            If you do not agree, please do not use the Service.
          </p>

          <h2>1. Who We Are and What We Offer</h2>
          <p>
            AuraLingovia is an online exam-preparation platform focused exclusively on the TELC B2
            German-language examination. The Service currently provides the written ("Schriftlich")
            exam module — Lesen (reading), Hören (listening), Sprachbausteine (grammar), and Schreiben
            (writing), including full timed exam simulations and AI-assisted writing feedback. Additional
            modules, including the oral ("Mündlich") exam module, are in active development and will be
            enabled for all users once they meet our internal quality standard; their eventual
            availability does not change any right or obligation under these Terms.
          </p>

          <h2>2. Eligibility and Accounts</h2>
          <ul>
            <li>You must be at least 16 years old to create an account. If you are under 18, you confirm you have your parent or legal guardian's permission to use the Service.</li>
            <li>You must provide accurate registration information and keep your password confidential. You are responsible for all activity that occurs under your account.</li>
            <li>Accounts are personal and non-transferable. Sharing a single paid account across multiple people, or reselling access, is not permitted.</li>
            <li>You must verify your email address before certain features (including subscribing to a plan) become available.</li>
          </ul>

          <h2>3. Subscription Plans, Pricing, and Billing</h2>
          <ul>
            <li>Current plans and prices are published on our <a href="/#pricing">Pricing</a> page and, once logged in, on your Billing page. All prices are listed in Tunisian Dinar (TND) unless stated otherwise.</li>
            <li>Only plans marked as available for purchase can be bought at any given time; plans covering modules that are not yet released (see Section 1) are not offered for sale until those modules go live.</li>
            <li>Subscriptions renew automatically for successive billing periods (currently monthly) at the then-current price until cancelled, for any payment method that supports automatic renewal. Where automatic renewal is not technically possible (for example, D17 Mobile Transfer, which requires a new manual payment each period), your access simply ends at the close of the paid period unless you submit a new payment.</li>
            <li>We may change plan pricing going forward. Changes will not apply retroactively to a period you have already paid for, and where required by law we will give advance notice before a price change takes effect on your next renewal.</li>
            <li>You are responsible for any taxes applicable to your purchase, except taxes on our net income.</li>
          </ul>

          <h2>4. Payment Methods</h2>
          <p>We currently support the following payment methods; not all methods may be available in every country:</p>
          <ul>
            <li><strong>D17 Mobile Transfer</strong> — available to students in Tunisia. You submit a payment confirmation screenshot, which our team (assisted by automated review tooling) verifies before activating your subscription — usually within moments, and within 8 working hours if manual review is required.</li>
            <li><strong>Lemon Squeezy (card payments)</strong> — international card payments processed by Lemon Squeezy, a merchant of record for digital subscriptions. This method is being activated; where shown as "pending" or "coming soon" in the app, it is not yet available for real purchases.</li>
          </ul>
          <p>We do not store your full card number or D17 PIN on our servers. See our <Link to="/privacy">Privacy Policy</Link> for details on payment-related data we do process.</p>

          <h2>5. Cancellation</h2>
          <p>
            You may cancel your subscription at any time by contacting <a href="mailto:Support@auralingoviatestdeutsch.academy">Support@auralingoviatestdeutsch.academy</a>
            {" "}(or via our other listed <Link to="/contact">contact channels</Link>). Cancelling stops future renewal charges; it does not, by
            itself, end your access early — you keep full access to your plan's content through the end of
            the period you already paid for. For information on getting money back for the current period,
            see our <Link to="/refund">Refund Policy</Link>. We are working on an in-app self-service
            cancellation button; until it ships, cancellation requests submitted through support are
            processed promptly and at no charge.
          </p>

          <h2>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Copy, scrape, redistribute, or resell exam content, exercises, audio, or AI-generated feedback from the Service;</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Service, except where applicable law expressly permits it;</li>
            <li>Use automated tools (bots, scripts) to access the Service in a way that circumvents rate limits, usage caps, or access controls;</li>
            <li>Attempt to gain unauthorized access to another user's account or data, or to probe, scan, or test the vulnerability of the Service without our prior written permission;</li>
            <li>Submit fraudulent, forged, or manipulated payment confirmations; or</li>
            <li>Use the Service for any unlawful purpose or in violation of any applicable export, sanctions, or local law.</li>
          </ul>
          <p>We may suspend or terminate accounts that violate this section, with or without notice, and withhold refunds where the violation involves fraud or abuse.</p>

          <h2>7. AI-Assisted Feedback</h2>
          <p>
            Certain features — including automated essay grading and, where enabled, spoken-exam
            evaluation — use third-party large language models (currently including models provided by
            Anthropic and Google) to generate feedback and scores. This feedback is a study aid intended
            to approximate official TELC grading criteria; it is <strong>not</strong> an official TELC
            score, is not issued or endorsed by telc GmbH or any examination board, and does not guarantee
            any outcome on the actual TELC B2 examination. Submitted writing and speech may be processed
            by these third-party providers solely to generate your feedback, as described in our{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>8. Intellectual Property</h2>
          <p>
            The Service, including its software, design, exercises, model answers, audio recordings, and
            AI-grading logic, is owned by AuraLingovia or its licensors and protected by copyright and
            other intellectual property laws. We grant you a limited, personal, non-transferable,
            non-exclusive license to access and use the Service for your own exam preparation while your
            subscription (or free account access) is active. "TELC" and related marks belong to their
            respective owners; AuraLingovia is an independent exam-preparation provider and is not
            affiliated with, endorsed by, or sponsored by telc GmbH.
          </p>

          <h2>9. Disclaimers</h2>
          <p>
            The Service is provided "as is" and "as available." We do not guarantee that using
            AuraLingovia will result in passing the TELC B2 examination or any particular score — exam
            outcomes depend on many factors outside our control. We do not warrant that the Service will
            be uninterrupted, error-free, or available at all times, though we take reasonable steps to
            keep it reliable.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, AuraLingovia and its team will not be liable for any
            indirect, incidental, special, or consequential damages arising from your use of the Service.
            Our total liability for any claim relating to the Service is limited to the amount you paid us
            in the 3 months preceding the event giving rise to the claim. Nothing in these Terms limits
            liability that cannot legally be limited, such as liability for fraud or gross negligence.
          </p>

          <h2>11. Termination</h2>
          <p>
            You may stop using the Service and close your account at any time by contacting support. We
            may suspend or terminate your access if you violate these Terms, if required by law, or if we
            discontinue the Service, in which case we will make reasonable efforts to give notice and, if
            applicable, handle any refund in line with our <Link to="/refund">Refund Policy</Link>.
          </p>

          <h2>12. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time to reflect changes to the Service or for legal
            reasons. We will post the updated Terms here with a new "Last updated" date, and for material
            changes we will make reasonable efforts to notify active subscribers (for example, by email or
            in-app notification) before the change takes effect. Continued use of the Service after a
            change becomes effective constitutes acceptance of the updated Terms.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Tunisia, without regard to conflict-of-law principles,
            except where mandatory consumer-protection laws of your country of residence grant you
            additional rights that cannot be waived.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions about these Terms? Reach us at{" "}
            <a href="mailto:Support@auralingoviatestdeutsch.academy">Support@auralingoviatestdeutsch.academy</a> or via our{" "}
            <Link to="/contact">Contact page</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const LAST_UPDATED = "July 22, 2026";
const SUPPORT_EMAIL = "Support@auralingoviatestdeutsch.academy";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — AuraLingovia" },
      { name: "description", content: "AuraLingovia's refund policy — eligibility window, how to request a refund, and processing times for D17 and Lemon Squeezy payments." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Refund Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed">
          <p>
            We want you to be confident subscribing to AuraLingovia. This policy explains when you're
            eligible for a refund, how to request one, and how long it takes — for both of our payment
            methods, D17 Mobile Transfer and Lemon Squeezy.
          </p>

          <h2>1. Eligibility Window</h2>
          <p>
            You may request a full refund within <strong>7 days</strong> of your purchase date, provided
            you have not substantially used the premium content unlocked by that purchase (for example,
            completing multiple exam simulations or accessing a large share of the Schriftlich or
            Mündlich exercise library). This lets you try a plan risk-free while preventing refund abuse
            after the content has already been consumed.
          </p>

          <h2>2. How to Request a Refund</h2>
          <p>
            Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> (or message us on{" "}
            <a href="https://t.me/+21620046880" target="_blank" rel="noopener noreferrer">Telegram</a>)
            with your account email and the approximate date of purchase. There is no cancellation fee
            and no need to explain your reason, though feedback is always welcome. We aim to confirm
            eligibility within 24 hours.
          </p>

          <h2>3. How Refunds Are Issued</h2>
          <ul>
            <li><strong>D17 Mobile Transfer</strong> — since D17 payments are manual mobile transfers, refunds are processed manually by our team back to the mobile number or account you paid from. This typically takes a few business days.</li>
            <li><strong>Lemon Squeezy (card payments)</strong> — refunds are issued to your original card via Lemon Squeezy. Processing time depends on your card issuer, typically 5–10 business days to appear on your statement.</li>
          </ul>
          <p>In both cases, once we approve a refund your subscription access ends immediately, and no further renewal charges will occur.</p>

          <h2>4. Cancellation vs. Refund</h2>
          <p>
            Cancelling your subscription (see our <Link to="/terms">Terms of Service</Link>) stops future
            renewal charges but does not automatically refund the period you've already paid for — you
            keep access through the end of that period. If you'd like your money back for the current
            period as well, submit a refund request under Section 2 within the eligibility window above.
          </p>

          <h2>5. When We Cannot Offer a Refund</h2>
          <ul>
            <li>Requests made after the 7-day eligibility window;</li>
            <li>Accounts where the plan's content has already been substantially used, as described in Section 1;</li>
            <li>Accounts suspended or terminated for violating our <Link to="/terms">Terms of Service</Link> (including fraud, forged payment confirmations, or abuse); and</li>
            <li>Chargebacks filed directly with your bank or card issuer without first contacting us — we're always happy to resolve billing issues directly and faster than a chargeback dispute.</li>
          </ul>

          <h2>6. Questions</h2>
          <p>
            If anything about a charge looks wrong, contact us first — most billing questions are
            resolved the same day. Reach us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or
            via our <Link to="/contact">Contact page</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

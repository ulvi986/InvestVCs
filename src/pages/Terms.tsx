import Layout from "@/components/Layout";

const Terms = () => {
  return (
    <Layout>
      <div className="container max-w-3xl py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Terms of Service</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: May 29, 2026</p>

        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold">1. Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using InvestVCs ("the Service"), you agree to be bound
              by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">2. The Service</h2>
            <p className="text-muted-foreground">
              InvestVCs provides AI-powered investment research, startup analysis,
              market intelligence, and portfolio management tools through a
              subscription-based SaaS platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">3. Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You must provide accurate and complete information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">4. Subscriptions and Billing</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Paid plans are billed in advance on a recurring basis (monthly or annually).</li>
              <li>Payments are processed by third-party providers such as Paddle, Polar, Dodo Payments, or Stripe.</li>
              <li>Subscriptions renew automatically unless cancelled before the renewal date.</li>
              <li>Prices may change with at least 30 days' prior notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">5. Refund Policy</h2>
            <p className="text-muted-foreground">
              Subscription fees are generally non-refundable except where required
              by law. You may cancel at any time; access continues until the end of
              the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">6. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Reverse-engineer, scrape, or resell the Service without permission.</li>
              <li>Upload malicious code or attempt to disrupt the Service.</li>
              <li>Misrepresent your identity or violate others' rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">7. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, software, and trademarks on the Service are the property
              of InvestVCs or its licensors. You retain ownership of content you
              submit, and grant us a limited license to process it to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">8. No Investment Advice</h2>
            <p className="text-muted-foreground">
              InvestVCs provides informational tools and AI-generated insights for
              research purposes only. Nothing on the Service constitutes financial,
              legal, or investment advice. You are solely responsible for your
              investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              The Service is provided "as is" and "as available" without warranties
              of any kind, express or implied. We do not guarantee accuracy,
              completeness, or uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, InvestVCs shall not be liable
              for any indirect, incidental, consequential, or punitive damages, or
              loss of profits, data, or business arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">11. Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate your access to the Service at any time
              for violation of these Terms or for any other reason at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. Material changes will be
              communicated via email or in-app notice. Continued use after changes
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by applicable laws of the jurisdiction in
              which InvestVCs operates, without regard to conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">14. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these Terms? Email <a href="mailto:support@investvcs.com" className="text-primary underline">support@investvcs.com</a>.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Terms;

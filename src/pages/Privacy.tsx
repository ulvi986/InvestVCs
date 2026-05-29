import Layout from "@/components/Layout";

const Privacy = () => {
  return (
    <Layout>
      <div className="container max-w-3xl py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: May 29, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground">
              InvestVCs ("we", "us", "our") provides AI-powered investment research,
              startup analysis, market intelligence, and portfolio management tools
              through a subscription model. This Privacy Policy describes how we
              collect, use, and protect your information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Account data: name, email address, company, role, LinkedIn URL.</li>
              <li>Payment data: processed securely by our payment providers (Paddle, Polar, Dodo Payments, Stripe). We do not store full card numbers.</li>
              <li>Usage data: pages viewed, features used, device and browser information.</li>
              <li>Content you provide: startup data, financial records, evaluation inputs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>To provide, maintain, and improve the InvestVCs platform.</li>
              <li>To process subscriptions, billing, and customer support.</li>
              <li>To generate AI-powered insights and analysis on your behalf.</li>
              <li>To send transactional emails and important service updates.</li>
              <li>To comply with legal obligations and prevent fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">4. Sharing of Information</h2>
            <p className="text-muted-foreground">
              We do not sell your personal data. We share information only with
              trusted service providers (hosting, analytics, AI processing, payment
              processing) under strict confidentiality, or when required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">5. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard safeguards including encryption in
              transit, row-level security on our database, and access controls.
              No method of transmission is 100% secure, but we work continuously
              to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">6. Your Rights</h2>
            <p className="text-muted-foreground">
              Depending on your jurisdiction (including GDPR and CCPA), you may
              request access, correction, deletion, or portability of your data,
              and object to certain processing. Contact us to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data while your account is active and for a reasonable
              period afterwards as required for legal, accounting, or reporting needs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">8. International Transfers</h2>
            <p className="text-muted-foreground">
              Your data may be processed in countries other than your own. We use
              appropriate safeguards such as Standard Contractual Clauses where required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">9. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our services are not directed to individuals under 18. We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy periodically. Continued use of the
              service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">11. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy inquiries, contact us at <a href="mailto:support@investvcs.com" className="text-primary underline">support@investvcs.com</a>.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;

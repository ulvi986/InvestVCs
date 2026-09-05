import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Github, Linkedin, Twitter, Mail } from "lucide-react";
import { useState } from "react";
import logoImg from "@/assets/logo.jpeg";
import { useLanguage } from "@/context/LanguageContext";

const ease = [0.22, 1, 0.36, 1] as const;

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { to: "/evaluation", label: "Startup Evaluation" },
      { to: "/preparation", label: "Financial Dashboard" },
      { to: "/readiness", label: "Readiness Level" },
      { to: "/venture-analysis", label: "Venture Analysis" },
      { to: "/pricing", label: "Pricing" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { to: "/growth-hub", label: "Growth Hub" },
      { to: "/community", label: "Community" },
      { to: "/investors", label: "Investor Network" },
      { to: "/vacancies", label: "Job Board" },
      { to: "/contact", label: "Contact" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Service" },
      { to: "/contact", label: "Get in Touch" },
    ],
  },
};

const Footer = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="relative z-10 border-t border-[var(--rule)] bg-background/50 backdrop-blur-sm">
      {/* Top CTA band */}
      <div className="border-b border-[var(--rule)]">
        <div className="container py-12">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div>
              <h3 className="font-origin-display text-2xl font-light text-[var(--ink-1)] sm:text-3xl">
                Ready to value your startup <span className="italic text-origin-gradient">with confidence?</span>
              </h3>
              <p className="mt-2 text-sm text-[var(--ink-3)] font-light">
                Join founders who walk into every room with data.
              </p>
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[hsl(216,12%,6%)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(255,255,255,0.25)]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand column */}
          <div className="lg:col-span-5">
            <Link to="/" className="flex items-center gap-2.5 font-display text-xl font-bold hover:opacity-80 transition-opacity">
              <img src={logoImg} alt="InvestVCs" className="h-9 w-9 rounded-xl object-cover" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                InvestVCs
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--ink-3)] font-light">
              {t("landing.manifesto") ||
                "Valuation is a negotiation. Walk into the room with data, conviction and the same frameworks the investors use — not a number you invented."}
            </p>

            {/* Newsletter */}
            <div className="mt-8">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--ink-3)] font-medium mb-3">
                Stay in the loop
              </p>
              {subscribed ? (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-[hsl(150,60%,55%)] font-light"
                >
                  ✓ You're on the list. Check your inbox.
                </motion.p>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 rounded-xl border border-[var(--rule)] bg-[var(--band)] px-4 py-2.5 text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-3)] outline-none transition-all duration-300 focus:border-[color-mix(in_srgb,var(--accent-ink)_50%,transparent)] focus:bg-[var(--band)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent-ink)_20%,transparent)]"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--band)] px-4 py-2.5 text-sm text-[var(--ink-2)] transition-all duration-300 hover:bg-[var(--band)] hover:text-[var(--ink-1)] border border-[var(--rule)]"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Social */}
            <div className="mt-6 flex gap-3">
              {[
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Linkedin, href: "#", label: "LinkedIn" },
                { icon: Github, href: "#", label: "GitHub" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--rule)] bg-[var(--band)] text-[var(--ink-3)] transition-all duration-300 hover:border-[var(--rule)] hover:bg-[var(--band)] hover:text-[var(--ink-1)]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation columns */}
          <div className="lg:col-span-7 grid grid-cols-2 gap-8 sm:grid-cols-3">
            {Object.values(footerLinks).map((section) => (
              <div key={section.title}>
                <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--ink-3)] font-medium mb-5">
                  {section.title}
                </p>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-[var(--ink-2)] font-light transition-all duration-300 hover:text-[var(--ink-1)] hover:translate-x-1 inline-block"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--rule)]">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <p className="text-[12px] text-[var(--ink-3)] font-light">
            © {new Date().getFullYear()} InvestVCs. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-[12px] text-[var(--ink-3)] font-light transition-colors duration-300 hover:text-[var(--ink-2)]">
              Privacy
            </Link>
            <Link to="/terms" className="text-[12px] text-[var(--ink-3)] font-light transition-colors duration-300 hover:text-[var(--ink-2)]">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

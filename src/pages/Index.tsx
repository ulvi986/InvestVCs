import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  Shield,
  DollarSign,
  ClipboardCheck,
  BrainCircuit,
  Check,
  Rocket,
  Briefcase,
  Target,
} from "lucide-react";
import { motion, useScroll, useTransform, useInView, animate } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import OriginBackground from "@/components/OriginBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useRef, useState } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease },
  }),
};

/* Count-up figure, triggered on scroll into view */
const Counter = ({ to, suffix = "" }: { to: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.8,
      ease,
      onUpdate: (v) => setVal(v),
      onComplete: () => setVal(to),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {Math.round(val)}
      {suffix}
    </span>
  );
};

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yUp = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  // Origin "Themed Content Cards" shown beneath the hero
  const showcase = [
    { cls: "card-violet", label: "Pre-seed valuation", value: "$4.2M", note: "Berkus · Scorecard · VC Method" },
    { cls: "card-ocean", label: "Runway", value: "18 months", note: "Burn $42k / mo · tracked monthly" },
    { cls: "card-rose", label: "Readiness", value: "TRL 7", note: "Investor-ready across TRL · CRL · FRL" },
  ];

  const features = [
    { icon: Shield, title: t("landing.feature1_title"), description: t("landing.feature1_desc"), link: "/evaluation", tint: "tint-ocean", color: "#00b3dd" },
    { icon: DollarSign, title: t("landing.feature2_title"), description: t("landing.feature2_desc"), link: "/preparation", tint: "tint-violet", color: "#847dff" },
    { icon: ClipboardCheck, title: t("landing.feature3_title"), description: t("landing.feature3_desc"), link: "/readiness", tint: "tint-rose", color: "#dd90d8" },
    {
      icon: BrainCircuit,
      title: t("landing.feature4_title") || "Venture Analysis",
      description: t("landing.feature4_desc") || "Business Model Canvas and Pitch Deck analysis with AI-powered insights.",
      link: "/venture-analysis",
      tint: "tint-sky",
      color: "#90b8f0",
    },
  ];

  const stats = [
    { value: 5, suffix: "+", label: t("landing.stat_valuation") },
    { value: 15, suffix: "+", label: t("landing.stat_metrics") },
    { value: 3, suffix: "", label: t("landing.stat_readiness") },
    { value: 100, suffix: "%", label: "Data-driven" },
  ];

  const audiences = [
    { icon: Rocket, color: "#847dff", title: "Early-stage founders", desc: "Turn a raw idea into an investor-ready story with valuations, financials and readiness scores that hold up in the room." },
    { icon: Briefcase, color: "#00b3dd", title: "Investors & VCs", desc: "Screen deals faster. Compare startups on the same five frameworks and surface the metrics that move a decision." },
    { icon: Target, color: "#dd90d8", title: "Accelerators & builders", desc: "Standardise how your cohort measures traction, runway and readiness — from day one to demo day." },
  ];

  const steps = [
    { t: t("landing.step1_title") || "Sign up", d: t("landing.step1_desc") || "Create your free account in seconds." },
    { t: t("landing.step2_title") || "Input your data", d: t("landing.step2_desc") || "Fill in valuation methods, financials and readiness checks." },
    { t: t("landing.step3_title") || "Get insights", d: t("landing.step3_desc") || "Receive instant valuations, charts and strategic advice." },
    { t: t("landing.step4_title") || "Pitch with confidence", d: t("landing.step4_desc") || "Use data-backed valuations in investor conversations." },
  ];

  return (
    <div className="relative min-h-dvh flex flex-col">
      <OriginBackground />
      <Navbar />

      <main className="flex-1 relative z-10">
        {/* ───────── Hero ───────── */}
        <section ref={heroRef} className="relative">
          <motion.div style={{ y: yUp, opacity: fade }} className="container pt-24 pb-16 lg:pt-32 lg:pb-20">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 rounded-full origin-glass px-4 py-1.5 text-[13px] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#847dff]" />
                  {t("landing.badge")}
                </span>
              </motion.div>

              <motion.h1
                className="mt-8 font-origin-display font-light text-white text-5xl sm:text-6xl lg:text-7xl leading-[1.05]"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={1}
              >
                {t("landing.hero_title")}{" "}
                <span className="italic text-origin-gradient">{t("landing.hero_highlight")}</span>
                <span className="block text-white/55 mt-2 text-3xl sm:text-4xl lg:text-5xl">
                  {t("landing.hero_sub")}
                </span>
              </motion.h1>

              <motion.p
                className="mx-auto mt-7 max-w-xl text-base sm:text-lg font-light leading-relaxed text-white/55"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={2}
              >
                {t("landing.hero_desc")}
              </motion.p>

              <motion.div
                className="mt-9 flex flex-col sm:flex-row gap-3 justify-center"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={3}
              >
                {user ? (
                  <Link to="/summary">
                    <Button variant="white" size="lg" className="origin-shimmer px-8">
                      {t("landing.go_dashboard")} <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/signup">
                      <Button variant="white" size="lg" className="origin-shimmer px-8">
                        {t("landing.get_started")} <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/signin">
                      <Button variant="outline" size="lg" className="px-8">
                        {t("landing.signin")}
                      </Button>
                    </Link>
                  </>
                )}
              </motion.div>
            </div>

            {/* Themed showcase cards */}
            <div className="mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-3">
              {showcase.map((c, i) => (
                <motion.div
                  key={c.label}
                  className={`${c.cls} rounded-3xl p-7 text-left`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.14, duration: 0.8, ease }}
                >
                  <div className="animate-origin-float" style={{ animationDelay: `${i * 1.3}s` }}>
                    <p className="text-[13px] font-medium text-white/70">{c.label}</p>
                    <p className="mt-3 font-origin-display text-4xl font-medium text-white">{c.value}</p>
                    <p className="mt-3 text-[13px] leading-relaxed text-white/65">{c.note}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ───────── Features ───────── */}
        <section className="container py-24 lg:py-28">
          <div className="max-w-2xl">
            <motion.p
              className="text-[13px] uppercase tracking-[0.25em] text-white/40"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            >
              The platform
            </motion.p>
            <motion.h2
              className="mt-4 font-origin-display font-light text-white text-4xl sm:text-5xl leading-tight"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            >
              {t("landing.features_title")}{" "}
              <span className="italic text-origin-gradient">{t("landing.features_highlight")}</span>
            </motion.h2>
            <motion.p
              className="mt-5 text-white/55 font-light text-lg leading-relaxed"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
            >
              {t("landing.features_desc")}
            </motion.p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" animate="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i}
              >
                <Link
                  to={user ? f.link : "/signup"}
                  className={`group block h-full rounded-3xl ${f.tint} p-7 transition-all duration-500 hover:-translate-y-1`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <f.icon className="h-6 w-6" style={{ color: f.color }} strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-6 font-origin-display text-xl font-medium text-white">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55 font-light">{f.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm text-white/70 group-hover:gap-2 transition-all">
                    {t("landing.explore")} <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────── Stats ───────── */}
        <section className="container py-12">
          <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4 border-y border-white/[0.07] py-14">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center"
                initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <p className="font-origin-display text-5xl font-light text-white">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-3 text-[13px] uppercase tracking-wider text-white/40">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────── Who it's for ───────── */}
        <section className="container py-24 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <motion.p
              className="text-[13px] uppercase tracking-[0.25em] text-white/40"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            >
              Built for both sides of the table
            </motion.p>
            <motion.h2
              className="mt-4 font-origin-display font-light text-white text-4xl sm:text-5xl"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            >
              One platform for <span className="italic text-origin-gradient">founders & investors</span>
            </motion.h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {audiences.map((a, i) => (
              <motion.div
                key={a.title}
                className="rounded-3xl bg-card border border-white/[0.07] p-8 transition-all duration-500 hover:-translate-y-1"
                initial="hidden" animate="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${a.color}1f` }}>
                  <a.icon className="h-6 w-6" style={{ color: a.color }} strokeWidth={1.6} />
                </div>
                <h3 className="mt-6 font-origin-display text-xl font-medium text-white">{a.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55 font-light">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────── How it works ───────── */}
        <section className="container py-24 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h2
              className="font-origin-display font-light text-white text-4xl sm:text-5xl"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            >
              {t("landing.how_title") || "How it works"}
            </motion.h2>
            <motion.p
              className="mt-4 text-white/55 font-light text-lg"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            >
              {t("landing.how_desc") || "Four simple steps to data-driven startup valuation."}
            </motion.p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className="rounded-3xl bg-card border border-white/[0.07] p-7"
                initial="hidden" animate="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i}
              >
                <span className="font-origin-display text-3xl font-light text-origin-gradient">0{i + 1}</span>
                <h3 className="mt-5 text-lg font-medium text-white">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55 font-light">{step.d}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────── Pricing ───────── */}
        <section id="pricing" className="container py-24 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <motion.p
              className="text-[13px] uppercase tracking-[0.25em] text-white/40"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            >
              Pricing
            </motion.p>
            <motion.h2
              className="mt-4 font-origin-display font-light text-white text-4xl sm:text-5xl"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            >
              Simple, <span className="italic text-origin-gradient">transparent pricing</span>
            </motion.h2>
            <motion.p
              className="mt-5 text-white/55 font-light text-lg"
              initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
            >
              Start free. Upgrade when you're ready to unlock AI insights and a voucher code.
            </motion.p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
            {[
              { name: "Free", price: "$0", period: "forever", features: ["Basic startup discovery", "Limited monthly searches", "Community support"], cta: "Get Started", to: "/signup", highlighted: false },
              { name: "Pro", price: "$2.99", period: "/week", features: ["AI insights & startup analysis", "Portfolio tracking", "Unlimited searches", "AI voucher code included"], cta: "Purchase", to: "https://polar.sh/checkout/polar_c_HLSqATQ43uZEWSbZVexf0V9xUVczrOKRNEOQv3o0Wxy", highlighted: true, polar: true },
              { name: "Enterprise", price: "Custom", period: "", features: ["Dedicated account manager", "Custom integrations", "Team seats & SSO", "SLA & priority support"], cta: "Contact Sales", to: "/contact", highlighted: false },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1 ${
                  plan.highlighted ? "tint-violet" : "bg-card border border-white/[0.07]"
                }`}
                initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[11px] font-semibold text-black">
                    Most Popular
                  </span>
                )}
                <h3 className="font-origin-display text-xl font-medium text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-origin-display text-4xl font-light text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-white/45">{plan.period}</span>}
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70 font-light">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#847dff]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {(plan as any).polar ? (
                    <a href={plan.to} data-polar-checkout data-polar-checkout-theme="dark" className="block w-full">
                      <Button variant="white" className="w-full origin-shimmer">{plan.cta}</Button>
                    </a>
                  ) : (
                    <Link to={plan.to} className="block w-full">
                      <Button variant={plan.highlighted ? "white" : "outline"} className="w-full">{plan.cta}</Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────── CTA ───────── */}
        <section className="container pb-28">
          <motion.div
            className="relative overflow-hidden rounded-[32px] px-8 py-20 text-center md:px-16"
            style={{ background: "var(--gradient-hero, linear-gradient(180deg,#0d0e10,#12161d))" }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 55% 60% at 50% 0%, rgba(132,125,255,0.28), transparent 70%)" }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-origin-display font-light text-white text-4xl sm:text-5xl leading-tight">
                {t("landing.cta_title")}
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-white/55 font-light text-lg">{t("landing.cta_desc")}</p>
              <div className="mt-9">
                <Link to={user ? "/summary" : "/signup"}>
                  <Button variant="white" size="lg" className="origin-shimmer px-10">
                    {user ? t("landing.go_dashboard") : t("landing.cta_btn")}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

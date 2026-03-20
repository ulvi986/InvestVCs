import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import {
  ArrowRight,
  Shield,
  TrendingUp,
  ClipboardList,
  DollarSign,
  Zap,
  Target,
  LineChart,
  Code,
  Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const features = [
  {
    icon: Shield,
    title: "Pre-Seed & Seed Valuation",
    description:
      "Berkus, Scorecard, Risk Factor, VC Method, and First Chicago — all in one place with instant results.",
    link: "/evaluation",
  },
  {
    icon: DollarSign,
    title: "Financial Management",
    description:
      "Track revenue, expenses, burn rate, runway, CLTV, and more with monthly snapshots and dashboards.",
    link: "/preparation",
  },
  {
    icon: ClipboardList,
    title: "Readiness Assessment",
    description:
      "Measure your TRL, CRL, and FRL levels to understand exactly where your startup stands.",
    link: "/readiness",
  },
];

const stats = [
  { value: "5+", label: "Valuation Methods" },
  { value: "15+", label: "Financial Metrics" },
  { value: "3", label: "Readiness Levels" },
  { value: "∞", label: "Snapshots" },
];

const steps = [
  {
    icon: Code,
    title: "Sign Up",
    description: "Create your free account in seconds.",
  },
  {
    icon: Target,
    title: "Input Your Data",
    description: "Fill in valuation methods, financials, and readiness checks.",
  },
  {
    icon: LineChart,
    title: "Get Insights",
    description: "Receive instant valuations, charts, and strategic advice.",
  },
  {
    icon: Rocket,
    title: "Pitch with Confidence",
    description: "Use data-backed valuations in investor conversations.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

const Index = () => {
  const { user } = useAuth();

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217_91%_60%/0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(172_66%_50%/0.06),transparent_60%)]" />

        <div className="container relative py-24 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
                <Zap className="h-3.5 w-3.5" />
                Built for Founders & Developers
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-7xl leading-[1.1]"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              Know Your Startup's{" "}
              <span className="text-gradient">True Value</span>
              <br />
              <span className="text-muted-foreground text-3xl sm:text-4xl lg:text-5xl font-bold">
                Before Investors Do
              </span>
            </motion.h1>

            <motion.p
              className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
            >
              Stop guessing. Use the same valuation frameworks VCs use — Berkus, Scorecard,
              Risk Factor, VC Method & First Chicago — to calculate, track, and present your
              startup's worth with confidence.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
            >
              {user ? (
                <Link to="/evaluation">
                  <Button
                    size="lg"
                    className="gradient-primary text-primary-foreground border-0 shadow-elevated px-8 text-base h-12"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="gradient-primary text-primary-foreground border-0 shadow-elevated px-8 text-base h-12"
                    >
                      Get Started — Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/signin">
                    <Button variant="outline" size="lg" className="px-8 text-base h-12">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="container py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={scaleIn}
                custom={i}
              >
                <p className="text-3xl font-extrabold text-gradient">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl font-bold text-foreground sm:text-4xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              Everything You Need to{" "}
              <span className="text-gradient">Evaluate & Prepare</span>
            </motion.h2>
            <motion.p
              className="mt-4 text-muted-foreground max-w-xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              Three powerful modules designed to take your startup from idea to investor-ready.
            </motion.p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group relative rounded-2xl border border-border bg-card p-8 shadow-card hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {f.description}
                </p>
                <Link
                  to={user ? f.link : "/signup"}
                  className="inline-flex items-center text-sm font-semibold text-primary group-hover:gap-2 gap-1 transition-all"
                >
                  Explore
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl font-bold text-foreground sm:text-4xl"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              How It Works
            </motion.h2>
            <motion.p
              className="mt-4 text-muted-foreground"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              Four simple steps to data-driven startup valuation.
            </motion.p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                className="relative rounded-2xl border border-border bg-card p-6 text-center shadow-card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground shadow-md">
                  {i + 1}
                </div>
                <div className="mt-4 mb-4 flex justify-center">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <motion.div
            className="relative overflow-hidden rounded-3xl gradient-primary p-12 text-center shadow-elevated md:p-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            custom={0}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(0_0%_100%/0.1),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold text-primary-foreground sm:text-4xl">
                Ready to Know What You're Worth?
              </h2>
              <p className="mt-4 text-primary-foreground/80 max-w-lg mx-auto">
                Join founders who use data — not guesswork — to negotiate with investors.
              </p>
              <div className="mt-8">
                <Link to={user ? "/evaluation" : "/signup"}>
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 border-0 px-8 text-base h-12 font-bold shadow-lg"
                  >
                    {user ? "Go to Dashboard" : "Start Free Evaluation"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;

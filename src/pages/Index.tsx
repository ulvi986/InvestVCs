import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Shield,
  ClipboardList,
  DollarSign,
  Zap,
  Target,
  LineChart,
  Code,
  Rocket,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import AuroraBackground from "@/components/AuroraBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const features = [
    {
      icon: Shield,
      title: t("landing.feature1_title"),
      description: t("landing.feature1_desc"),
      link: "/evaluation",
    },
    {
      icon: DollarSign,
      title: t("landing.feature2_title"),
      description: t("landing.feature2_desc"),
      link: "/preparation",
    },
    {
      icon: ClipboardList,
      title: t("landing.feature3_title"),
      description: t("landing.feature3_desc"),
      link: "/readiness",
    },
    {
      icon: BarChart3,
      title: t("landing.feature4_title") || "Venture Analysis",
      description: t("landing.feature4_desc") || "Business Model Canvas and Pitch Deck analysis with AI-powered insights.",
      link: "/venture-analysis",
    },
  ];

  const stats = [
    { value: "5+", label: t("landing.stat_valuation") },
    { value: "15+", label: t("landing.stat_metrics") },
    { value: "3", label: t("landing.stat_readiness") },
    { value: "∞", label: t("landing.stat_snapshots") },
  ];

  const steps = [
    { icon: Code, title: t("landing.step1_title"), description: t("landing.step1_desc") },
    { icon: Target, title: t("landing.step2_title"), description: t("landing.step2_desc") },
    { icon: LineChart, title: t("landing.step3_title"), description: t("landing.step3_desc") },
    { icon: Rocket, title: t("landing.step4_title"), description: t("landing.step4_desc") },
  ];

  return (
    <div className="relative min-h-screen flex flex-col">
      <AuroraBackground />
      <Navbar />

      <main className="flex-1 relative z-10">
        {/* ─── Hero ─── */}
        <section className="relative min-h-[85vh] flex items-center">
          <div className="container relative z-10 py-20 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-5 py-2 text-xs font-semibold text-cyan-300 mb-8">
                  <Zap className="h-3.5 w-3.5" />
                  {t("landing.badge")}
                </span>
              </motion.div>

              <motion.h1
                className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl leading-[1.1]"
                style={{ color: "hsl(210 30% 95%)" }}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={1}
              >
                {t("landing.hero_title")}{" "}
                <span className="text-cyan-400">{t("landing.hero_highlight")}</span>
              </motion.h1>

              <motion.p
                className="mt-5 text-lg sm:text-xl font-medium"
                style={{ color: "hsl(210 20% 70%)" }}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={1.5}
              >
                {t("landing.hero_sub")}
              </motion.p>

              <motion.p
                className="mx-auto mt-5 max-w-2xl text-base leading-relaxed"
                style={{ color: "hsl(210 15% 55%)" }}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={2}
              >
                {t("landing.hero_desc")}
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={3}
              >
                {user ? (
                  <Link to="/summary">
                    <Button
                      size="lg"
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold border-0 px-10 h-12 rounded-xl shadow-[0_4px_20px_hsl(180_60%_45%/0.3)] transition-all"
                    >
                      {t("landing.go_dashboard")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/signup">
                      <Button
                        size="lg"
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold border-0 px-10 h-12 rounded-xl shadow-[0_4px_20px_hsl(180_60%_45%/0.3)] transition-all"
                      >
                        {t("landing.get_started")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/signin">
                      <Button
                        variant="outline"
                        size="lg"
                        className="px-10 h-12 rounded-xl border-white/15 bg-white/5 backdrop-blur-md text-white/80 hover:bg-white/10 hover:text-white transition-all"
                      >
                        {t("landing.signin")}
                      </Button>
                    </Link>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── Transition to white content ─── */}
        <div className="relative">
          {/* Smooth dark-to-light transition */}
          <div className="h-24 bg-gradient-to-b from-transparent to-background" />

          {/* ─── Stats ─── */}
          <section className="bg-background">
            <div className="container py-12">
              <div className="mx-auto max-w-4xl grid grid-cols-2 gap-8 md:grid-cols-4">
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
                    <p className="text-4xl font-extrabold text-primary">{s.value}</p>
                    <p className="mt-2 text-sm text-muted-foreground font-medium">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── Features ─── */}
          <section className="bg-background py-24">
            <div className="container">
              <div className="text-center mb-14">
                <motion.h2
                  className="text-3xl sm:text-4xl font-bold text-foreground"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={0}
                >
                  {t("landing.features_title")}{" "}
                  <span className="text-primary">{t("landing.features_highlight")}</span>
                </motion.h2>
                <motion.p
                  className="mt-4 text-muted-foreground max-w-xl mx-auto"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={1}
                >
                  {t("landing.features_desc")}
                </motion.p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    className="group relative rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={i}
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {f.description}
                    </p>
                    <Link
                      to={user ? f.link : "/signup"}
                      className="inline-flex items-center text-sm font-semibold text-primary group-hover:gap-2 gap-1 transition-all"
                    >
                      {t("landing.explore")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── How it Works ─── */}
          <section className="bg-muted/30 py-24">
            <div className="container">
              <div className="text-center mb-14">
                <motion.h2
                  className="text-3xl sm:text-4xl font-bold text-foreground"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={0}
                >
                  {t("landing.how_title")}
                </motion.h2>
                <motion.p
                  className="mt-4 text-muted-foreground"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={1}
                >
                  {t("landing.how_desc")}
                </motion.p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.title}
                    className="relative rounded-2xl border border-border bg-card p-8 text-center shadow-sm hover:shadow-md transition-all duration-300"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={i}
                  >
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md">
                      {i + 1}
                    </div>
                    <div className="mt-4 mb-5 flex justify-center">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h4 className="font-bold text-foreground mb-2">{step.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── CTA ─── */}
          <section className="bg-background py-24">
            <div className="container">
              <motion.div
                className="relative overflow-hidden rounded-3xl p-12 text-center md:p-20"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(215 45% 14%) 0%, hsl(200 50% 18%) 50%, hsl(180 45% 22%) 100%)",
                }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={scaleIn}
                custom={0}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(180_50%_40%/0.15),transparent_70%)]" />
                <div className="relative">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                    {t("landing.cta_title")}
                  </h2>
                  <p className="mt-4 text-white/60 max-w-lg mx-auto text-base">
                    {t("landing.cta_desc")}
                  </p>
                  <div className="mt-10">
                    <Link to={user ? "/summary" : "/signup"}>
                      <Button
                        size="lg"
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold border-0 px-10 h-12 rounded-xl shadow-[0_4px_20px_hsl(180_60%_45%/0.3)]"
                      >
                        {user ? t("landing.go_dashboard") : t("landing.cta_btn")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

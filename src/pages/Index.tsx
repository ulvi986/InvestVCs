import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import AuroraBackground from "@/components/AuroraBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
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
      accent: "from-blue-500 to-cyan-400",
      glow: "shadow-[0_0_30px_hsl(217_91%_60%/0.15)]",
    },
    {
      icon: DollarSign,
      title: t("landing.feature2_title"),
      description: t("landing.feature2_desc"),
      link: "/preparation",
      accent: "from-emerald-500 to-teal-400",
      glow: "shadow-[0_0_30px_hsl(172_66%_50%/0.15)]",
    },
    {
      icon: ClipboardList,
      title: t("landing.feature3_title"),
      description: t("landing.feature3_desc"),
      link: "/readiness",
      accent: "from-violet-500 to-purple-400",
      glow: "shadow-[0_0_30px_hsl(280_70%_55%/0.15)]",
    },
    {
      icon: BarChart3,
      title: t("landing.feature4_title") || "Venture Analysis",
      description: t("landing.feature4_desc") || "Business Model Canvas and Pitch Deck analysis with AI-powered insights.",
      link: "/venture-analysis",
      accent: "from-amber-500 to-orange-400",
      glow: "shadow-[0_0_30px_hsl(45_90%_55%/0.15)]",
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
        <section className="relative min-h-[90vh] flex items-center">
          <div className="container relative z-10 py-20 lg:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-xl px-6 py-2.5 text-xs font-semibold text-primary mb-8 shadow-[0_0_20px_hsl(217_91%_60%/0.1)]">
                  <Zap className="h-3.5 w-3.5" />
                  {t("landing.badge")}
                </span>
              </motion.div>

              <motion.h1
                className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-8xl leading-[1.05]"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={1}
              >
                {t("landing.hero_title")}{" "}
                <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 bg-clip-text text-transparent">
                  {t("landing.hero_highlight")}
                </span>
              </motion.h1>

              <motion.p
                className="mt-5 text-xl sm:text-2xl text-muted-foreground font-medium tracking-tight"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={1.5}
              >
                {t("landing.hero_sub")}
              </motion.p>

              <motion.p
                className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground/70 leading-relaxed"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={2}
              >
                {t("landing.hero_desc")}
              </motion.p>

              <motion.div
                className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={3}
              >
                {user ? (
                  <Link to="/summary">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 via-primary to-violet-600 text-primary-foreground border-0 shadow-[0_4px_30px_hsl(217_91%_60%/0.3)] px-12 text-sm h-13 rounded-2xl font-semibold hover:shadow-[0_4px_40px_hsl(217_91%_60%/0.5)] transition-all duration-300"
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
                        className="bg-gradient-to-r from-blue-600 via-primary to-violet-600 text-primary-foreground border-0 shadow-[0_4px_30px_hsl(217_91%_60%/0.3)] px-12 text-sm h-13 rounded-2xl font-semibold hover:shadow-[0_4px_40px_hsl(217_91%_60%/0.5)] transition-all duration-300"
                      >
                        {t("landing.get_started")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/signin">
                      <Button
                        variant="outline"
                        size="lg"
                        className="px-12 text-sm h-13 rounded-2xl border-border/40 bg-card/30 backdrop-blur-xl hover:bg-card/50 transition-all"
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

        {/* ─── Stats ─── */}
        <section className="relative">
          <div className="container py-16">
            <div className="mx-auto max-w-4xl rounded-3xl border border-border/20 bg-card/20 backdrop-blur-2xl p-10 shadow-[0_8px_60px_hsl(217_91%_60%/0.06)]">
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
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 bg-clip-text text-transparent">
                      {s.value}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground font-medium">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section className="py-28 relative">
          <div className="container">
            <div className="text-center mb-16">
              <motion.h2
                className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={0}
              >
                {t("landing.features_title")}{" "}
                <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 bg-clip-text text-transparent">
                  {t("landing.features_highlight")}
                </span>
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
                  className={`group relative rounded-3xl border border-border/20 bg-card/15 backdrop-blur-2xl p-8 hover:-translate-y-2 transition-all duration-500 ${f.glow} hover:shadow-[0_0_50px_hsl(217_91%_60%/0.2)]`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.accent} shadow-lg`}>
                    <f.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
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
        <section className="py-28 relative overflow-hidden">
          <div className="container relative">
            <div className="text-center mb-16">
              <motion.h2
                className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight"
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
                  className="relative rounded-3xl border border-border/20 bg-card/15 backdrop-blur-2xl p-8 text-center shadow-[0_4px_40px_hsl(217_91%_60%/0.04)] hover:shadow-[0_8px_50px_hsl(217_91%_60%/0.1)] transition-all duration-300"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-bold text-white shadow-[0_0_20px_hsl(217_91%_60%/0.3)]">
                    {i + 1}
                  </div>
                  <div className="mt-4 mb-5 flex justify-center">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center">
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
        <section className="py-28">
          <div className="container">
            <motion.div
              className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-primary to-violet-600 p-12 text-center md:p-20 shadow-[0_8px_60px_hsl(217_91%_60%/0.3)]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              custom={0}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(0_0%_100%/0.12),transparent_70%)]" />
              {/* CTA wave */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full opacity-10">
                  <path d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,48C840,43,960,53,1080,64C1200,75,1320,85,1380,90.7L1440,96L1440,120L0,120Z" fill="white"/>
                </svg>
              </div>
              <div className="relative">
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {t("landing.cta_title")}
                </h2>
                <p className="mt-4 text-white/70 max-w-lg mx-auto text-base">
                  {t("landing.cta_desc")}
                </p>
                <div className="mt-10">
                  <Link to={user ? "/summary" : "/signup"}>
                    <Button
                      size="lg"
                      className="bg-white text-primary hover:bg-white/90 border-0 px-12 text-sm h-13 font-bold shadow-[0_4px_30px_hsl(0_0%_100%/0.3)] rounded-2xl"
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
      </main>

      <Footer />
    </div>
  );
};

export default Index;

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
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

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
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

/* Animated SVG Wave */
const AnimatedWaves = () => (
  <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
    <svg
      className="relative block w-full"
      style={{ height: "180px" }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <path
        fill="hsl(217 91% 60% / 0.06)"
        d="M0,96L48,112C96,128,192,160,288,176C384,192,480,192,576,170.7C672,149,768,107,864,101.3C960,96,1056,128,1152,149.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
      >
        <animate
          attributeName="d"
          dur="12s"
          repeatCount="indefinite"
          values="
            M0,96L48,112C96,128,192,160,288,176C384,192,480,192,576,170.7C672,149,768,107,864,101.3C960,96,1056,128,1152,149.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L0,320Z;
            M0,128L48,138.7C96,149,192,171,288,165.3C384,160,480,128,576,128C672,128,768,160,864,170.7C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L0,320Z;
            M0,96L48,112C96,128,192,160,288,176C384,192,480,192,576,170.7C672,149,768,107,864,101.3C960,96,1056,128,1152,149.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L0,320Z
          "
        />
      </path>
      <path
        fill="hsl(172 66% 50% / 0.05)"
        d="M0,160L48,154.7C96,149,192,139,288,149.3C384,160,480,192,576,197.3C672,203,768,181,864,165.3C960,149,1056,139,1152,149.3C1248,160,1344,192,1392,208L1440,224L1440,320L0,320Z"
      >
        <animate
          attributeName="d"
          dur="15s"
          repeatCount="indefinite"
          values="
            M0,160L48,154.7C96,149,192,139,288,149.3C384,160,480,192,576,197.3C672,203,768,181,864,165.3C960,149,1056,139,1152,149.3C1248,160,1344,192,1392,208L1440,224L1440,320L0,320Z;
            M0,192L48,186.7C96,181,192,171,288,181.3C384,192,480,224,576,218.7C672,213,768,171,864,160C960,149,1056,171,1152,186.7C1248,203,1344,213,1392,218.7L1440,224L1440,320L0,320Z;
            M0,160L48,154.7C96,149,192,139,288,149.3C384,160,480,192,576,197.3C672,203,768,181,864,165.3C960,149,1056,139,1152,149.3C1248,160,1344,192,1392,208L1440,224L1440,320L0,320Z
          "
        />
      </path>
      <path
        fill="hsl(217 91% 60% / 0.03)"
        d="M0,224L48,218.7C96,213,192,203,288,208C384,213,480,235,576,229.3C672,224,768,192,864,186.7C960,181,1056,203,1152,213.3C1248,224,1344,224,1392,224L1440,224L1440,320L0,320Z"
      >
        <animate
          attributeName="d"
          dur="18s"
          repeatCount="indefinite"
          values="
            M0,224L48,218.7C96,213,192,203,288,208C384,213,480,235,576,229.3C672,224,768,192,864,186.7C960,181,1056,203,1152,213.3C1248,224,1344,224,1392,224L1440,224L1440,320L0,320Z;
            M0,256L48,245.3C96,235,192,213,288,213.3C384,213,480,235,576,240C672,245,768,235,864,218.7C960,203,1056,181,1152,181.3C1248,181,1344,203,1392,213.3L1440,224L1440,320L0,320Z;
            M0,224L48,218.7C96,213,192,203,288,208C384,213,480,235,576,229.3C672,224,768,192,864,186.7C960,181,1056,203,1152,213.3C1248,224,1344,224,1392,224L1440,224L1440,320L0,320Z
          "
        />
      </path>
    </svg>
  </div>
);

/* Floating particles */
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: `${8 + i * 4}px`,
          height: `${8 + i * 4}px`,
          left: `${10 + i * 15}%`,
          top: `${20 + (i % 3) * 25}%`,
          background: i % 2 === 0
            ? "hsl(217 91% 60% / 0.08)"
            : "hsl(172 66% 50% / 0.06)",
        }}
        animate={{
          y: [-20, 20, -20],
          x: [-10, 10, -10],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 6 + i * 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.5,
        }}
      />
    ))}
  </div>
);

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const features = [
    {
      icon: Shield,
      title: t("landing.feature1_title"),
      description: t("landing.feature1_desc"),
      link: "/evaluation",
      gradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      icon: DollarSign,
      title: t("landing.feature2_title"),
      description: t("landing.feature2_desc"),
      link: "/preparation",
      gradient: "from-emerald-500/10 to-teal-500/10",
    },
    {
      icon: ClipboardList,
      title: t("landing.feature3_title"),
      description: t("landing.feature3_desc"),
      link: "/readiness",
      gradient: "from-violet-500/10 to-purple-500/10",
    },
    {
      icon: BarChart3,
      title: t("landing.feature4_title") || "Venture Analysis",
      description: t("landing.feature4_desc") || "Business Model Canvas and Pitch Deck analysis with AI-powered insights.",
      link: "/venture-analysis",
      gradient: "from-orange-500/10 to-amber-500/10",
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
    <Layout>
      {/* Hero with animated waves */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217_91%_60%/0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(172_66%_50%/0.08),transparent_60%)]" />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Animated waves at bottom */}
        <AnimatedWaves />

        <div className="container relative z-10 py-20 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-xs font-semibold text-primary mb-8 shadow-sm backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5" />
                {t("landing.badge")}
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-7xl leading-[1.1]"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              {t("landing.hero_title")}{" "}
              <span className="text-gradient">{t("landing.hero_highlight")}</span>
            </motion.h1>

            <motion.p
              className="mt-4 text-xl sm:text-2xl text-muted-foreground font-medium"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1.5}
            >
              {t("landing.hero_sub")}
            </motion.p>

            <motion.p
              className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground/80 leading-relaxed"
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
                    className="gradient-primary text-primary-foreground border-0 shadow-elevated px-10 text-sm h-12 rounded-xl font-semibold"
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
                      className="gradient-primary text-primary-foreground border-0 shadow-elevated px-10 text-sm h-12 rounded-xl font-semibold"
                    >
                      {t("landing.get_started")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/signin">
                    <Button variant="outline" size="lg" className="px-10 text-sm h-12 rounded-xl border-border/60 backdrop-blur-sm">
                      {t("landing.signin")}
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-y border-border/30 bg-card/50 backdrop-blur-sm">
        <div className="container py-16">
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
                <p className="text-4xl font-extrabold text-gradient">{s.value}</p>
                <p className="mt-2 text-sm text-muted-foreground font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-28 relative">
        <div className="container">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl sm:text-4xl font-bold text-foreground"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              {t("landing.features_title")}{" "}
              <span className="text-gradient">{t("landing.features_highlight")}</span>
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
                className={`group relative rounded-2xl border border-border/40 bg-gradient-to-br ${f.gradient} p-8 shadow-card hover:shadow-elevated hover:border-primary/20 hover:-translate-y-1 transition-all duration-500`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-elevated">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
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

      {/* How it Works */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />
        <div className="container relative">
          <div className="text-center mb-16">
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
                className="relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-8 text-center shadow-card hover:shadow-elevated transition-all duration-300"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground shadow-elevated">
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

      {/* CTA */}
      <section className="py-28">
        <div className="container">
          <motion.div
            className="relative overflow-hidden rounded-3xl gradient-primary p-12 text-center shadow-elevated md:p-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            custom={0}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(0_0%_100%/0.1),transparent_70%)]" />
            {/* CTA wave decoration */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full opacity-10">
                <path d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,48C840,43,960,53,1080,64C1200,75,1320,85,1380,90.7L1440,96L1440,120L0,120Z" fill="white"/>
              </svg>
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-foreground">
                {t("landing.cta_title")}
              </h2>
              <p className="mt-4 text-primary-foreground/80 max-w-lg mx-auto text-base">
                {t("landing.cta_desc")}
              </p>
              <div className="mt-10">
                <Link to={user ? "/summary" : "/signup"}>
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 border-0 px-10 text-sm h-12 font-bold shadow-lg rounded-xl"
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
    </Layout>
  );
};

export default Index;

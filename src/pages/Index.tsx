import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, DollarSign, ClipboardCheck, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import AuroraBackground from "@/components/AuroraBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import hero3d from "@/assets/hero-3d.png";

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
      image: featureValuation,
      title: t("landing.feature1_title"),
      description: t("landing.feature1_desc"),
      link: "/evaluation",
    },
    {
      image: featureFinancial,
      title: t("landing.feature2_title"),
      description: t("landing.feature2_desc"),
      link: "/preparation",
    },
    {
      image: featureReadiness,
      title: t("landing.feature3_title"),
      description: t("landing.feature3_desc"),
      link: "/readiness",
    },
    {
      image: featureVenture,
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

  return (
    <div className="relative min-h-screen flex flex-col">
      <AuroraBackground />
      <Navbar />

      <main className="flex-1 relative z-10">
        {/* ═══════ Hero — split layout ═══════ */}
        <section className="relative min-h-[88vh] flex items-center">
          <div className="container relative z-10 py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left — text */}
              <div>
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 dark:border-white/10 dark:bg-white/5 backdrop-blur-md px-5 py-2 text-xs font-semibold text-primary dark:text-cyan-300 mb-6">
                    <Zap className="h-3.5 w-3.5" />
                    {t("landing.badge")}
                  </span>
                </motion.div>

                <motion.h1
                  className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.08]"
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={1}
                >
                  {t("landing.hero_title")}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
                    {t("landing.hero_highlight")}
                  </span>
                </motion.h1>

                <motion.p
                  className="mt-5 text-lg text-muted-foreground font-medium max-w-lg"
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={2}
                >
                  {t("landing.hero_sub")}
                </motion.p>

                <motion.p
                  className="mt-4 text-sm text-muted-foreground/70 max-w-md leading-relaxed"
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={2.5}
                >
                  {t("landing.hero_desc")}
                </motion.p>

                <motion.div
                  className="mt-8 flex flex-col sm:flex-row gap-3"
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={3}
                >
                  {user ? (
                    <Link to="/summary">
                      <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold border-0 px-8 h-12 rounded-xl shadow-lg transition-all">
                        {t("landing.go_dashboard")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/signup">
                        <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold border-0 px-8 h-12 rounded-xl shadow-lg transition-all">
                          {t("landing.get_started")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to="/signin">
                        <Button variant="outline" size="lg" className="px-8 h-12 rounded-xl border-border/40 bg-card/30 dark:bg-white/5 backdrop-blur-md transition-all">
                          {t("landing.signin")}
                        </Button>
                      </Link>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Right — 3D illustration */}
              <motion.div
                className="flex justify-center lg:justify-end"
                initial={{ opacity: 0, scale: 0.9, x: 40 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              >
                <div className="relative">
                  {/* Glow behind image */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-purple-500/10 blur-3xl scale-110" />
                  <img
                    src={hero3d}
                    alt="InvestVCs Platform"
                    width={500}
                    height={500}
                    className="relative w-[340px] sm:w-[420px] lg:w-[480px] drop-shadow-2xl"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════ Features section with glassmorphism ═══════ */}
        <section className="relative py-20">
          {/* Subtle section bg */}
          <div className="absolute inset-0 bg-card/40 dark:bg-card/20 backdrop-blur-sm border-y border-border/20" />
          <div className="container relative">
            <div className="text-center mb-14">
              <motion.h2
                className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={0}
              >
                {t("landing.features_title")}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
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

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="group relative rounded-2xl border border-border/30 dark:border-white/10 bg-card/60 dark:bg-white/5 backdrop-blur-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-400"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="mb-4 flex justify-center">
                    <img
                      src={f.image}
                      alt={f.title}
                      loading="lazy"
                      width={180}
                      height={180}
                      className="w-[140px] h-[140px] object-contain drop-shadow-lg"
                    />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
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

        {/* ═══════ Stats ═══════ */}
        <section className="py-16 relative">
          <div className="container">
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
                  <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground font-medium">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ CTA ═══════ */}
        <section className="py-20">
          <div className="container">
            <motion.div
              className="relative overflow-hidden rounded-3xl p-12 text-center md:p-16"
              style={{
                background: "linear-gradient(135deg, hsl(215 50% 20%) 0%, hsl(200 45% 22%) 50%, hsl(172 40% 25%) 100%)",
              }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              custom={0}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(172_50%_40%/0.12),transparent_70%)]" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                  {t("landing.cta_title")}
                </h2>
                <p className="mt-4 text-white/60 max-w-lg mx-auto text-base">
                  {t("landing.cta_desc")}
                </p>
                <div className="mt-8">
                  <Link to={user ? "/summary" : "/signup"}>
                    <Button
                      size="lg"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold border-0 px-10 h-12 rounded-xl shadow-lg"
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

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
import { useLanguage } from "@/context/LanguageContext";
import heroBg from "@/assets/hero-bg.jpg";

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
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217_91%_60%/0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(172_66%_50%/0.04),transparent_60%)]" />

        <div className="container relative py-28 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-5 py-2 text-xs font-medium text-primary mb-8">
                <Zap className="h-3.5 w-3.5" />
                {t("landing.badge")}
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.15]"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              {t("landing.hero_title")}{" "}
              <span className="text-gradient">{t("landing.hero_highlight")}</span>
              <br />
              <span className="text-muted-foreground text-2xl sm:text-3xl lg:text-4xl font-semibold">
                {t("landing.hero_sub")}
              </span>
            </motion.h1>

            <motion.p
              className="mx-auto mt-8 max-w-2xl text-base text-muted-foreground leading-relaxed"
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
                <Link to="/evaluation">
                  <Button
                    size="lg"
                    className="gradient-primary text-primary-foreground border-0 shadow-elevated px-8 text-sm h-11 rounded-xl"
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
                      className="gradient-primary text-primary-foreground border-0 shadow-elevated px-8 text-sm h-11 rounded-xl"
                    >
                      {t("landing.get_started")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/signin">
                    <Button variant="outline" size="lg" className="px-8 text-sm h-11 rounded-xl">
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
      <section className="border-y border-border/50 bg-card/30">
        <div className="container py-14">
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
                <p className="text-3xl font-bold text-gradient">{s.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-28">
        <div className="container">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl font-bold text-foreground"
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
              className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              {t("landing.features_desc")}
            </motion.p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group relative rounded-2xl border border-border/60 bg-card p-8 shadow-card hover:shadow-elevated hover:border-primary/15 transition-all duration-500"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-sm">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {f.description}
                </p>
                <Link
                  to={user ? f.link : "/signup"}
                  className="inline-flex items-center text-sm font-medium text-primary group-hover:gap-2 gap-1 transition-all"
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
      <section className="py-28 bg-muted/20">
        <div className="container">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl font-bold text-foreground"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              {t("landing.how_title")}
            </motion.h2>
            <motion.p
              className="mt-4 text-muted-foreground text-sm"
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
                className="relative rounded-2xl border border-border/60 bg-card p-6 text-center shadow-card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground shadow-sm">
                  {i + 1}
                </div>
                <div className="mt-4 mb-4 flex justify-center">
                  <step.icon className="h-7 w-7 text-primary/80" />
                </div>
                <h4 className="font-semibold text-foreground mb-2 text-sm">{step.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <div className="container">
          <motion.div
            className="relative overflow-hidden rounded-3xl gradient-primary p-12 text-center shadow-elevated md:p-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            custom={0}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(0_0%_100%/0.08),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-primary-foreground">
                {t("landing.cta_title")}
              </h2>
              <p className="mt-4 text-primary-foreground/75 max-w-lg mx-auto text-sm">
                {t("landing.cta_desc")}
              </p>
              <div className="mt-8">
                <Link to={user ? "/evaluation" : "/signup"}>
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 border-0 px-8 text-sm h-11 font-semibold shadow-lg rounded-xl"
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

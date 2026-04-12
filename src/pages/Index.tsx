import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, Zap, Shield, DollarSign, ClipboardCheck, BrainCircuit, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import AuroraBackground from "@/components/AuroraBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [contactForm, setContactForm] = useState({ name: "", surname: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.surname || !contactForm.email || !contactForm.message) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: {
          to: "u.sharifzade@gmail.com",
          subject: `Contact Form: ${contactForm.name} ${contactForm.surname}`,
          message: contactForm.message,
          senderName: `${contactForm.name} ${contactForm.surname}`,
          senderEmail: contactForm.email,
        },
      });
      if (error) throw error;
      toast.success(t("landing.contact_success"));
      setContactForm({ name: "", surname: "", email: "", message: "" });
    } catch (err) {
      toast.error(t("landing.contact_error"));
    } finally {
      setSending(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: t("landing.feature1_title"),
      description: t("landing.feature1_desc"),
      link: "/evaluation",
      gradient: "from-blue-500 to-cyan-400",
      bg: "bg-blue-500/10 dark:bg-blue-400/10",
    },
    {
      icon: DollarSign,
      title: t("landing.feature2_title"),
      description: t("landing.feature2_desc"),
      link: "/preparation",
      gradient: "from-emerald-500 to-teal-400",
      bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
    },
    {
      icon: ClipboardCheck,
      title: t("landing.feature3_title"),
      description: t("landing.feature3_desc"),
      link: "/readiness",
      gradient: "from-violet-500 to-purple-400",
      bg: "bg-violet-500/10 dark:bg-violet-400/10",
    },
    {
      icon: BrainCircuit,
      title: t("landing.feature4_title") || "Venture Analysis",
      description: t("landing.feature4_desc") || "Business Model Canvas and Pitch Deck analysis with AI-powered insights.",
      link: "/venture-analysis",
      gradient: "from-amber-500 to-orange-400",
      bg: "bg-amber-500/10 dark:bg-amber-400/10",
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
            <div className="max-w-3xl mx-auto text-center">
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
                  className="mt-5 text-lg text-muted-foreground font-medium max-w-lg mx-auto"
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={2}
                >
                  {t("landing.hero_sub")}
                </motion.p>

                <motion.p
                  className="mt-4 text-sm text-muted-foreground/70 max-w-md mx-auto leading-relaxed"
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={2.5}
                >
                  {t("landing.hero_desc")}
                </motion.p>

                <motion.div
                  className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
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
          </div>
        </section>

        {/* ═══════ Features section with glassmorphism ═══════ */}
        <section className="relative py-20">
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
                  <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} shadow-lg`}>
                    <f.icon className="h-7 w-7 text-white" strokeWidth={1.8} />
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

        {/* ═══════ Contact Section ═══════ */}
        <section className="relative py-20">
          <div className="absolute inset-0 bg-card/40 dark:bg-card/20 backdrop-blur-sm border-y border-border/20" />
          <div className="container relative">
            <div className="text-center mb-10">
              <motion.h2
                className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={0}
              >
                {t("landing.contact_title")}
              </motion.h2>
              <motion.p
                className="mt-4 text-muted-foreground max-w-xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={1}
              >
                {t("landing.contact_desc")}
              </motion.p>
            </div>

            <motion.div
              className="max-w-lg mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={2}
            >
              <form
                onSubmit={handleContactSubmit}
                className="rounded-2xl border border-border/30 dark:border-white/10 bg-card/60 dark:bg-white/5 backdrop-blur-xl p-8 space-y-5 shadow-sm"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">{t("landing.contact_name")}</Label>
                    <Input
                      id="contact-name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-surname">{t("landing.contact_surname")}</Label>
                    <Input
                      id="contact-surname"
                      value={contactForm.surname}
                      onChange={(e) => setContactForm((p) => ({ ...p, surname: e.target.value }))}
                      required
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">{t("landing.contact_email")}</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">{t("landing.contact_message")}</Label>
                  <Textarea
                    id="contact-message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                    required
                    maxLength={2000}
                    rows={5}
                  />
                </div>
                <Button type="submit" disabled={sending} className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold border-0 h-11 rounded-xl shadow-lg">
                  {sending ? t("landing.contact_sending") : t("landing.contact_send")}
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </motion.div>
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

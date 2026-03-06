import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { ArrowRight, Shield, BarChart3, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Berkus Method",
    description: "Evaluate startup value based on key early-stage success components.",
  },
  {
    icon: BarChart3,
    title: "Scorecard Method",
    description: "Compare startup strength relative to the regional average.",
  },
  {
    icon: TrendingUp,
    title: "Risk Factor Method",
    description: "Adjust valuation based on startup risk categories.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const Index = () => (
  <Layout>
    {/* Hero */}
    <section className="gradient-hero">
      <div className="container py-24 text-center lg:py-32">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            Startup Valuation Platform
          </span>
        </motion.div>
        <motion.h1
          className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
        >
          Evaluate Your Startup Like a{" "}
          <span className="text-gradient">Venture Capitalist</span>
        </motion.h1>
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
        >
          Automatically calculate startup valuation using proven investor frameworks:
          Berkus Method, Scorecard Method, and Risk Factor Method.
        </motion.p>
        <motion.div className="mt-10" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <Link to="/evaluation">
            <Button size="lg" className="gradient-primary text-primary-foreground border-0 shadow-elevated px-8 text-base">
              Start Startup Evaluation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>

    {/* Features */}
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground">Three Proven Methods</h2>
          <p className="mt-3 text-muted-foreground">Industry-standard frameworks used by top investors worldwide.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-8 shadow-card hover:shadow-elevated transition-shadow"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Index;

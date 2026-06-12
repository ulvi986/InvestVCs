import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Send, Users, Rocket, TrendingUp, Search, Lightbulb, LineChart, Wallet,
  Sprout, GraduationCap, CreditCard, Bike, HeartPulse, ShoppingBag, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TrendsPanel from "@/components/TrendsPanel";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OriginBackground from "@/components/OriginBackground";

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.7, ease } }),
};

type Startup = {
  id: string;
  name: string;
  category: string;
  description: string;
  country?: string;
  founder?: string;
  avatar?: string;
  raised: number;
  goal: number;
  investors: number;
  stage?: string;
  icon: React.ElementType;
  tint: string;
};

// Industry → icon + accent tint
const industryStyle = (industry?: string): { icon: React.ElementType; tint: string } => {
  const key = (industry || "").toLowerCase();
  if (key.includes("agri") || key.includes("agro") || key.includes("food") || key.includes("green") || key.includes("clean")) return { icon: Sprout, tint: "#00b3dd" };
  if (key.includes("edu")) return { icon: GraduationCap, tint: "#847dff" };
  if (key.includes("fin") || key.includes("insur")) return { icon: CreditCard, tint: "#90b8f0" };
  if (key.includes("mobil") || key.includes("logist") || key.includes("travel")) return { icon: Bike, tint: "#dd90d8" };
  if (key.includes("health") || key.includes("bio")) return { icon: HeartPulse, tint: "#dd90d8" };
  if (key.includes("commerce") || key.includes("market") || key.includes("retail")) return { icon: ShoppingBag, tint: "#00b3dd" };
  return { icon: Building2, tint: "#847dff" };
};

// Graceful showcase fallback (mirrors the reference categories)
const FALLBACK: Startup[] = [
  { id: "f1", name: "AgroTech", category: "Agriculture", description: "IoT soil analysis and smart irrigation that lifts yields for regional farms.", raised: 184000, goal: 250000, investors: 312, stage: "Seed", icon: Sprout, tint: "#00b3dd" },
  { id: "f2", name: "EduAI", category: "EdTech", description: "AI-powered personalised learning, fully localised in Azerbaijani.", raised: 96000, goal: 200000, investors: 208, stage: "Pre-Seed", icon: GraduationCap, tint: "#847dff" },
  { id: "f3", name: "PayFlow", category: "FinTech", description: "QR payments and live inventory for small and medium merchants.", raised: 230000, goal: 300000, investors: 540, stage: "Seed", icon: CreditCard, tint: "#90b8f0" },
  { id: "f4", name: "GreenMove", category: "Mobility", description: "Shared electric scooters for clean, last-mile city transport.", raised: 142000, goal: 280000, investors: 274, stage: "Seed", icon: Bike, tint: "#dd90d8" },
  { id: "f5", name: "HealthBridge", category: "HealthTech", description: "Telemedicine that connects patients to specialists in minutes.", raised: 88000, goal: 220000, investors: 190, stage: "Pre-Seed", icon: HeartPulse, tint: "#dd90d8" },
  { id: "f6", name: "LocalMart", category: "E-Commerce", description: "A direct farmer-to-consumer marketplace cutting out the middleman.", raised: 121000, goal: 240000, investors: 233, stage: "Seed", icon: ShoppingBag, tint: "#00b3dd" },
];

const fmt = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
};

const steps = [
  { icon: Search, title: "Discover", text: "Browse vetted startups across FinTech, HealthTech, AgriTech and more." },
  { icon: Lightbulb, title: "Analyse", text: "Review team, market, traction and data-backed valuations on every deal." },
  { icon: Wallet, title: "Back them", text: "Express interest and connect directly with founders raising now." },
  { icon: LineChart, title: "Grow together", text: "Follow progress and watch your portfolio of ventures compound." },
];

const GrowthHub = () => {
  const { user } = useAuth();
  const [startups, setStartups] = useState<Startup[]>(FALLBACK);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Startup | null>(null);
  const [form, setForm] = useState({ name: "", surname: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [pRes, fundRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("startup_funding").select("*"),
      ]);
      const profiles = (pRes.data as any[]) ?? [];
      const funding = (fundRes.data as any[]) ?? [];
      const fundByUser = new Map(funding.map((f) => [f.user_id, f]));

      // Every registered startup (exclude investor accounts and empty names).
      const mapped: Startup[] = profiles
        .filter((p) => p.startup_name && p.startup_name.trim() && p.startup_name !== "Investor")
        .map((p) => {
          const f = fundByUser.get(p.id) || {};
          const { icon, tint } = industryStyle(p.industry);
          const founder = [p.name, p.surname].filter(Boolean).join(" ").trim();
          return {
            id: p.id,
            name: p.startup_name,
            category: p.industry || "Startup",
            description: p.startup_description?.trim() || "An innovative venture building toward its next milestone.",
            country: p.country || undefined,
            founder: founder || undefined,
            avatar: p.avatar_url || undefined,
            raised: Number(f.funding_raised) || 0,
            goal: Number(f.funding_goal) || 0,
            investors: Number(f.interest_count) || 0,
            stage: f.funding_stage,
            icon,
            tint,
          };
        });

      // Most-funded first, then the rest alphabetically.
      mapped.sort((a, b) => b.raised - a.raised || a.name.localeCompare(b.name));

      // Show every real startup; fall back to the curated showcase only when none exist.
      if (mapped.length > 0) setStartups(mapped);
    };
    load().catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const projects = startups.length;
    const investors = startups.reduce((s, x) => s + x.investors, 0);
    const raised = startups.reduce((s, x) => s + x.raised, 0);
    return { projects, investors, raised };
  }, [startups]);

  const filtered = startups.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const expressInterest = (s: Startup) => {
    setForm((prev) => ({ ...prev, message: `I'm interested in ${s.name} (${s.category}). Please share more about this opportunity.` }));
    setSelected(null);
    setTimeout(() => contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.surname || !form.email || !form.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-brevo-email", {
        body: {
          to: "u.sharifzade@gmail.com",
          subject: `Growth Hub: ${form.name} ${form.surname}`,
          message: form.message,
          senderName: `${form.name} ${form.surname}`,
          senderEmail: form.email,
        },
      });
      if (error) throw error;
      toast.success("Message sent successfully!");
      setForm({ name: "", surname: "", email: "", message: "" });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-dvh flex flex-col">
      <OriginBackground />
      <Navbar />

      <main className="flex-1 relative z-10">
        {/* ── Hero ── */}
        <section className="container pt-24 pb-14 lg:pt-28 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 rounded-full origin-glass px-4 py-1.5 text-[13px] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#847dff]" /> Growth Hub
            </span>
          </motion.div>
          <motion.h1 className="mx-auto mt-7 max-w-3xl font-origin-display font-light text-white text-4xl sm:text-6xl leading-[1.05]"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            Invest in <span className="italic text-origin-gradient">tomorrow's startups</span> today
          </motion.h1>
          <motion.p className="mx-auto mt-6 max-w-xl text-base sm:text-lg font-light text-white/55"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            Discover the ventures growing on InvestVCs — back founders early, follow their traction, and grow together.
          </motion.p>
          <motion.div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <a href="#startups"><Button variant="white" size="lg" className="origin-shimmer px-8">Discover startups <ArrowRight className="ml-1 h-4 w-4" /></Button></a>
            <Link to={user ? "/profile" : "/signup"}><Button variant="outline" size="lg" className="px-8">Submit your startup</Button></Link>
          </motion.div>
        </section>

        {/* ── Stats banner ── */}
        <section className="container">
          <div className="grid grid-cols-3 gap-4 rounded-3xl border border-white/[0.07] bg-card p-2 sm:p-3">
            {[
              { icon: Rocket, value: `${stats.projects}+`, label: "Active startups" },
              { icon: Users, value: stats.investors >= 1000 ? `${(stats.investors / 1000).toFixed(1)}K+` : `${stats.investors}+`, label: "Interested investors" },
              { icon: TrendingUp, value: `${fmt(stats.raised)}+`, label: "Funds in motion" },
            ].map((s, i) => (
              <motion.div key={s.label} className="flex flex-col items-center gap-1 rounded-2xl px-3 py-7 text-center"
                initial="hidden" animate="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <s.icon className="h-5 w-5 text-[#847dff]" />
                <p className="font-origin-display text-3xl sm:text-4xl font-light text-white">{s.value}</p>
                <p className="text-xs uppercase tracking-wider text-white/40">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Active startups ── */}
        <section id="startups" className="container py-20 lg:py-24">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-10">
            <div>
              <p className="text-[12px] uppercase tracking-[0.25em] text-white/40">Active now</p>
              <h2 className="mt-3 font-origin-display font-light text-white text-3xl sm:text-4xl">Our startups</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or category" className="pl-10 rounded-full" />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <div className="grid gap-5 sm:grid-cols-2">
            {filtered.map((s, i) => {
              const pct = s.goal > 0 ? Math.min(100, Math.round((s.raised / s.goal) * 100)) : 0;
              return (
                <motion.article key={s.id}
                  onClick={() => setSelected(s)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-card transition-all duration-500 hover:-translate-y-1 hover:border-white/15"
                  initial="hidden" animate="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i % 3}>
                  {/* Banner — profile photo fills the whole background */}
                  <div className="relative h-44 overflow-hidden">
                    {s.avatar ? (
                      <img src={s.avatar} alt={s.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${s.tint}, ${s.tint}22)` }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <s.icon className="h-14 w-14 text-white/85" strokeWidth={1.3} />
                        </div>
                      </div>
                    )}
                    {/* legibility overlay */}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25), transparent 35%, rgba(20,20,22,0.85))" }} />
                    <span className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">{s.category}</span>
                    {s.stage && <span className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">{s.stage}</span>}
                    <h3 className="absolute bottom-3 left-5 right-5 font-origin-display text-2xl font-medium text-white drop-shadow">{s.name}</h3>
                  </div>
                  {/* Body */}
                  <div className="flex flex-1 flex-col p-6">
                    {(s.founder || s.country) && (
                      <p className="text-xs text-white/40">{[s.founder, s.country].filter(Boolean).join(" · ")}</p>
                    )}
                    <p className="mt-2 text-sm leading-relaxed text-white/55 font-light line-clamp-2">{s.description}</p>

                    {/* Funding progress */}
                    {s.goal > 0 && (
                      <div className="mt-5">
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-origin-display text-lg text-white">{fmt(s.raised)}</span>
                          <span className="text-xs text-white/40">of {fmt(s.goal)}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div className="h-full rounded-full" style={{ background: s.tint }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-white/45">
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {s.investors} interested</span>
                          <span>{pct}% funded</span>
                        </div>
                      </div>
                    )}

                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-all group-hover:gap-2.5 group-hover:text-white">
                      View details <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.article>
              );
            })}
              </div>
              {filtered.length === 0 && (
                <p className="text-center text-white/40 py-16">No startups match "{search}".</p>
              )}
            </div>
            <TrendsPanel />
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="container py-16">
          <div className="text-center mb-12">
            <p className="text-[12px] uppercase tracking-[0.25em] text-white/40">How it works</p>
            <h2 className="mt-3 font-origin-display font-light text-white text-3xl sm:text-4xl">From discovery to growth</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div key={step.title} className="rounded-3xl border border-white/[0.07] bg-card p-7"
                initial="hidden" animate="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i}>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#847dff]/15">
                    <step.icon className="h-5 w-5 text-[#b9a7ff]" strokeWidth={1.7} />
                  </div>
                  <span className="font-origin-display text-2xl font-light text-white/20">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-medium text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55 font-light">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Contact ── */}
        <section ref={contactRef} id="contact" className="container py-20 lg:py-24">
          <div className="mx-auto max-w-2xl">
            <div className="text-center mb-10">
              <p className="text-[12px] uppercase tracking-[0.25em] text-white/40">Get in touch</p>
              <h2 className="mt-3 font-origin-display font-light text-white text-3xl sm:text-4xl">
                Want to <span className="italic text-origin-gradient">connect</span>?
              </h2>
              <p className="mt-4 text-white/55 font-light">
                Investing, raising, or partnering — leave a note and our team will reach out.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-white/[0.07] bg-card p-7 sm:p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gh-name">Name</Label>
                  <Input id="gh-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gh-surname">Surname</Label>
                  <Input id="gh-surname" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="Surname" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gh-email">Email</Label>
                <Input id="gh-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gh-message">Message</Label>
                <Textarea id="gh-message" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you're looking for…" />
              </div>
              <Button type="submit" variant="white" className="w-full origin-shimmer" disabled={sending}>
                {sending ? "Sending…" : <>Send message <Send className="ml-1.5 h-4 w-4" /></>}
              </Button>
            </form>
          </div>
        </section>
      </main>

      {/* ── Startup detail modal ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg overflow-hidden rounded-3xl border-white/10 bg-card p-0">
          {selected && (() => {
            const pct = selected.goal > 0 ? Math.min(100, Math.round((selected.raised / selected.goal) * 100)) : 0;
            const Icon = selected.icon;
            return (
              <div>
                {/* Banner */}
                <div className="relative h-52 overflow-hidden">
                  {selected.avatar ? (
                    <img src={selected.avatar} alt={selected.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${selected.tint}, ${selected.tint}22)` }}>
                      <div className="absolute inset-0 flex items-center justify-center"><Icon className="h-16 w-16 text-white/85" strokeWidth={1.2} /></div>
                    </div>
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3), transparent 40%, rgba(20,20,22,0.92))" }} />
                  <span className="absolute left-5 top-5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">{selected.category}</span>
                  <h2 className="absolute bottom-4 left-6 right-6 font-origin-display text-3xl font-medium text-white drop-shadow">{selected.name}</h2>
                </div>

                {/* Content */}
                <div className="max-h-[55vh] overflow-y-auto p-6">
                  {(selected.founder || selected.country) && (
                    <p className="text-sm text-white/45">{[selected.founder, selected.country].filter(Boolean).join(" · ")}</p>
                  )}
                  <p className="mt-3 text-sm leading-relaxed text-white/70 font-light">{selected.description}</p>

                  {/* Funding */}
                  {selected.goal > 0 ? (
                    <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                      <div className="flex items-baseline justify-between">
                        <span className="font-origin-display text-2xl text-white">{fmt(selected.raised)}</span>
                        <span className="text-xs text-white/40">raised of {fmt(selected.goal)}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: selected.tint }} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div><p className="font-origin-display text-xl text-white">{pct}%</p><p className="text-[11px] uppercase tracking-wider text-white/40">Funded</p></div>
                        <div><p className="font-origin-display text-xl text-white">{selected.investors}</p><p className="text-[11px] uppercase tracking-wider text-white/40">Investors</p></div>
                        <div><p className="font-origin-display text-xl text-white">{selected.stage || "—"}</p><p className="text-[11px] uppercase tracking-wider text-white/40">Stage</p></div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-white/55">
                      <Rocket className="h-4 w-4 text-[#847dff]" /> This startup hasn't opened a funding round yet.
                    </div>
                  )}

                  <Button variant="white" className="mt-6 w-full origin-shimmer" onClick={() => expressInterest(selected)}>
                    Express interest <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default GrowthHub;

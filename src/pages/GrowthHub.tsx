// Growth Hub.
//
// Startups raising, as an index rather than a wall of cards: a search, a row
// per company, and a funding bar that is the only chart on the page. The
// detail opens in place; expressing interest fills the contact form below.
//
// Data and behaviour are unchanged from the previous version. Only the
// presentation is new.

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import PageShell from "@/components/layout/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

type Startup = {
  id: string;
  name: string;
  category: string;
  description: string;
  country?: string;
  founder?: string;
  raised: number;
  goal: number;
  investors: number;
  stage?: string;
};

const fmt = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const buildFallback = (t: (key: string) => string): Startup[] => [
  { id: "f1", name: "AgroTech", category: "Agriculture", description: t("growth.fb1_desc"), raised: 184000, goal: 250000, investors: 312, stage: "Seed" },
  { id: "f2", name: "EduAI", category: "EdTech", description: t("growth.fb2_desc"), raised: 96000, goal: 200000, investors: 208, stage: "Pre-Seed" },
  { id: "f3", name: "PayFlow", category: "FinTech", description: t("growth.fb3_desc"), raised: 230000, goal: 300000, investors: 540, stage: "Seed" },
  { id: "f4", name: "GreenMove", category: "Mobility", description: t("growth.fb4_desc"), raised: 142000, goal: 280000, investors: 274, stage: "Seed" },
  { id: "f5", name: "HealthBridge", category: "HealthTech", description: t("growth.fb5_desc"), raised: 88000, goal: 220000, investors: 190, stage: "Pre-Seed" },
  { id: "f6", name: "LocalMart", category: "E-Commerce", description: t("growth.fb6_desc"), raised: 121000, goal: 240000, investors: 233, stage: "Seed" },
];

const GrowthHub = () => {
  const { t } = useLanguage();
  const realDataLoaded = useRef(false);
  const contactRef = useRef<HTMLDivElement>(null);

  const [startups, setStartups] = useState<Startup[]>(() => buildFallback(t));
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", surname: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [profileResult, fundingResult] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("startup_funding").select("*"),
      ]);
      const profiles = (profileResult.data as any[]) ?? [];
      const funding = (fundingResult.data as any[]) ?? [];
      const fundByUser = new Map(funding.map((row) => [row.user_id, row]));

      const mapped: Startup[] = profiles
        .filter((p) => p.startup_name?.trim() && p.startup_name !== "Investor")
        .map((p) => {
          const f = fundByUser.get(p.id) || {};
          const founder = [p.name, p.surname].filter(Boolean).join(" ").trim();
          return {
            id: p.id,
            name: p.startup_name,
            category: p.industry || "Startup",
            description: p.startup_description?.trim() || t("growth.fallback_desc"),
            country: p.country || undefined,
            founder: founder || undefined,
            raised: Number(f.funding_raised) || 0,
            goal: Number(f.funding_goal) || 0,
            investors: Number(f.interest_count) || 0,
            stage: f.funding_stage,
          };
        });

      mapped.sort((a, b) => b.raised - a.raised || a.name.localeCompare(b.name));

      if (mapped.length > 0) {
        realDataLoaded.current = true;
        setStartups(mapped);
      }
    };
    load().catch(() => {});
  }, [t]);

  useEffect(() => {
    if (!realDataLoaded.current) setStartups(buildFallback(t));
  }, [t]);

  const stats = useMemo(() => ({
    projects: startups.length,
    investors: startups.reduce((sum, s) => sum + s.investors, 0),
    raised: startups.reduce((sum, s) => sum + s.raised, 0),
  }), [startups]);

  const filtered = useMemo(() => {
    if (!search) return startups;
    const q = search.toLowerCase();
    return startups.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q));
  }, [startups, search]);

  const expressInterest = (startup: Startup) => {
    setForm((prev) => ({
      ...prev,
      message: t("growth.interest_msg").replace("{name}", startup.name).replace("{category}", startup.category),
    }));
    setOpenId(null);
    setTimeout(() => contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.surname || !form.email || !form.message) {
      toast.error(t("auth.fill_all"));
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
      toast.success(t("landing.contact_success"));
      setForm({ name: "", surname: "", email: "", message: "" });
    } catch {
      toast.error(t("landing.contact_error"));
    } finally {
      setSending(false);
    }
  };

  const field =
    "w-full rounded-[var(--radius)] border border-[var(--rule-strong)] bg-[var(--surface)] px-3 py-2 " +
    "text-[14px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:border-[var(--accent-ink)] focus:outline-none";

  return (
    <PageShell
      wide
      kicker="Growth Hub"
      title="Startups raising now"
      standfirst="Every company on InvestVCS that is open to investment, with what it has raised so far."
      action={
        <dl className="flex gap-8">
          {[
            { label: "Projects", value: String(stats.projects) },
            { label: "Investors", value: stats.investors.toLocaleString() },
            { label: "Raised", value: fmt(stats.raised) },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="kicker">{stat.label}</dt>
              <dd className="mt-1.5 text-[20px] tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">{stat.value}</dd>
            </div>
          ))}
        </dl>
      }
    >
      {/* Search */}
      <div className="relative max-w-[380px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-3)]" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, sector or description"
          aria-label="Search startups"
          className={`${field} pl-9`}
        />
      </div>

      {/* Index */}
      <ul className="mt-10">
        {filtered.map((startup) => {
          const pct = startup.goal > 0 ? Math.min(100, Math.round((startup.raised / startup.goal) * 100)) : 0;
          const isOpen = openId === startup.id;

          return (
            <li key={startup.id} className="border-b border-[var(--rule)]">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : startup.id)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-5 text-left
                           transition-colors hover:bg-[var(--band)] sm:grid-cols-[1.6fr_1fr_140px_90px]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-[var(--ink-1)]">{startup.name}</span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-[var(--ink-3)]">
                    {startup.category}
                    {startup.country ? ` · ${startup.country}` : ""}
                    {startup.stage ? ` · ${startup.stage}` : ""}
                  </span>
                </span>

                <span className="hidden min-w-0 truncate text-[13px] text-[var(--ink-2)] sm:block">
                  {startup.description}
                </span>

                <span className="hidden sm:block">
                  <span className="flex items-baseline justify-between">
                    <span className="text-[12.5px] tabular-nums text-[var(--ink-1)]">{fmt(startup.raised)}</span>
                    <span className="text-[11.5px] tabular-nums text-[var(--ink-3)]">{pct}%</span>
                  </span>
                  <span className="bar mt-1.5 block" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </span>

                <span className="text-right text-[12.5px] tabular-nums text-[var(--ink-3)]">
                  {startup.investors} backers
                </span>
              </button>

              {isOpen && (
                <div className="enter-up grid gap-6 pb-6 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">{startup.description}</p>
                    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                      {startup.founder && (
                        <div>
                          <dt className="kicker">Founder</dt>
                          <dd className="mt-1 text-[13px] text-[var(--ink-1)]">{startup.founder}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="kicker">Goal</dt>
                        <dd className="mt-1 text-[13px] tabular-nums text-[var(--ink-1)]">{fmt(startup.goal)}</dd>
                      </div>
                      <div>
                        <dt className="kicker">Raised</dt>
                        <dd className="mt-1 text-[13px] tabular-nums text-[var(--ink-1)]">{fmt(startup.raised)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => expressInterest(startup)}
                      className="rounded-[var(--radius)] bg-[var(--accent-ink)] px-4 py-2 text-[13px]
                                 font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Express interest
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenId(null)}
                      aria-label="Close"
                      className="p-2 text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="py-12 text-[13.5px] text-[var(--ink-3)]">No startup matches that search.</p>
      )}

      {/* Contact */}
      <div ref={contactRef} className="mt-20 scroll-mt-20 border-t border-[var(--rule)] pt-12">
        <p className="kicker">Get in touch</p>
        <h2 className="mt-2 text-[22px] leading-tight tracking-[-0.022em] text-[var(--ink-1)]">
          Tell us which company interests you
        </h2>

        <form onSubmit={handleSubmit} className="mt-7 max-w-[560px] space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="kicker">First name</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={`${field} mt-2`}
              />
            </label>
            <label className="block">
              <span className="kicker">Last name</span>
              <input
                value={form.surname}
                onChange={(event) => setForm({ ...form, surname: event.target.value })}
                className={`${field} mt-2`}
              />
            </label>
          </div>

          <label className="block">
            <span className="kicker">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={`${field} mt-2`}
            />
          </label>

          <label className="block">
            <span className="kicker">Message</span>
            <textarea
              rows={4}
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className={`${field} mt-2 resize-y`}
            />
          </label>

          <button
            type="submit"
            disabled={sending}
            className="rounded-[var(--radius)] bg-[var(--accent-ink)] px-4 py-2 text-[13.5px] font-medium
                       text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Sending" : "Send"}
          </button>
        </form>
      </div>
    </PageShell>
  );
};

export default GrowthHub;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Linkedin, Loader2, ArrowLeft, Building2, Briefcase, Rocket, MapPin, UserX,
  DollarSign, Target, TrendingUp, Users, CalendarDays, Layers, Clock, PieChart, Mail,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  name?: string;
  surname?: string;
  email?: string;
  avatar_url?: string;
  linkedin_url?: string;
  startup_name?: string;
  startup_description?: string;
  current_company?: string;
  industry?: string;
  country?: string;
};

type Funding = {
  funding_goal?: number | null;
  funding_raised?: number | null;
  funding_stage?: string | null;
  interest_count?: number | null;
  last_round_amount?: number | null;
  last_round_date?: string | null;
  last_round_investor_type?: string | null;
  timeline?: string | null;
  use_marketing_pct?: number | null;
  use_product_pct?: number | null;
  use_team_pct?: number | null;
  valuation?: number | null;
};

const initialsOf = (p: Profile, fallback = "U") =>
  ((p.name?.[0] || "") + (p.surname?.[0] || "")).toUpperCase() || fallback;

const fmtMoney = (n?: number | null) => {
  if (n == null || isNaN(Number(n))) return undefined;
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
  return `$${v.toLocaleString()}`;
};

const fmtDate = (s?: string | null) => {
  if (!s) return undefined;
  try { return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return s; }
};

const Detail = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-white/35">{label}</p>
        <p className="truncate text-sm text-white/85">{value}</p>
      </div>
    </div>
  );
};

const AllocationBar = ({ label, pct }: { label: string; pct?: number | null }) => {
  if (pct == null || isNaN(Number(pct))) return null;
  const v = Math.max(0, Math.min(100, Number(pct)));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-white/55">{label}</span>
        <span className="text-white/85">{v}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
};

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [funding, setFunding] = useState<Funding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const [profRes, fundRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, surname, email, avatar_url, linkedin_url, startup_name, startup_description, current_company, industry, country")
          .eq("id", id)
          .single(),
        supabase
          .from("startup_funding")
          .select("funding_goal, funding_raised, funding_stage, interest_count, last_round_amount, last_round_date, last_round_investor_type, timeline, use_marketing_pct, use_product_pct, use_team_pct, valuation")
          .eq("user_id", id)
          .maybeSingle(),
      ]);
      if (active) {
        setProfile((profRes.data as any) ?? null);
        setFunding((fundRes.data as any) ?? null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const fullName = profile ? [profile.name, profile.surname].filter(Boolean).join(" ") || "InvestVCs member" : "";

  const raised = Number(funding?.funding_raised) || 0;
  const goal = Number(funding?.funding_goal) || 0;
  const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const hasAllocation =
    funding != null &&
    [funding.use_marketing_pct, funding.use_product_pct, funding.use_team_pct].some((p) => p != null);
  const hasFunding =
    funding != null &&
    [funding.funding_goal, funding.funding_raised, funding.funding_stage, funding.valuation, funding.interest_count]
      .some((v) => v != null && v !== 0 && v !== "");

  return (
    <DashboardLayout title="Profile" subtitle="Member profile">
      <div className="mx-auto max-w-2xl space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : !profile ? (
          <div className="rounded-3xl border border-white/[0.07] bg-card p-12 text-center">
            <UserX className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="font-origin-display text-xl font-light text-white">Profile not found</p>
            <p className="mt-1 text-sm text-white/45">This member doesn't exist or is no longer available.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            {/* Header card */}
            <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
              <div className="flex items-start gap-5">
                <div
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-semibold text-white"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsOf(profile)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-origin-display text-2xl font-light text-white">{fullName}</h2>
                  {(profile.startup_name || profile.current_company) && (
                    <p className="mt-1 text-sm text-white/55">
                      {[profile.startup_name || profile.current_company, profile.industry].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {profile.email && (
                      <a
                        href={`mailto:${profile.email}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.07]"
                      >
                        <Mail className="h-3.5 w-3.5 text-primary" /> {profile.email}
                      </a>
                    )}
                    {profile.linkedin_url && (
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.07]"
                      >
                        <Linkedin className="h-3.5 w-3.5 text-[#90b8f0]" /> Connect on LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Startup description */}
            {profile.startup_description && (
              <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
                <div className="mb-3 flex items-center gap-2 text-white/70">
                  <Rocket className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">About the startup</h3>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                  {profile.startup_description}
                </p>
              </div>
            )}

            {/* Details grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail icon={Rocket} label="Startup" value={profile.startup_name} />
              <Detail icon={Building2} label="Current company" value={profile.current_company} />
              <Detail icon={Briefcase} label="Industry" value={profile.industry} />
              <Detail icon={MapPin} label="Country" value={profile.country} />
            </div>

            {/* Funding overview */}
            {hasFunding && (
              <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
                <div className="mb-4 flex items-center gap-2 text-white/70">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">Funding</h3>
                  {funding?.funding_stage && (
                    <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/70">
                      {funding.funding_stage}
                    </span>
                  )}
                </div>

                {goal > 0 && (
                  <div className="mb-5">
                    <div className="mb-1.5 flex items-end justify-between">
                      <span className="text-lg font-medium text-white">{fmtMoney(raised) ?? "$0"}</span>
                      <span className="text-xs text-white/45">of {fmtMoney(goal)} goal · {progress}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Detail icon={DollarSign} label="Raised" value={fmtMoney(funding?.funding_raised)} />
                  <Detail icon={Target} label="Goal" value={fmtMoney(funding?.funding_goal)} />
                  <Detail icon={Layers} label="Valuation" value={fmtMoney(funding?.valuation)} />
                  <Detail icon={Users} label="Interested investors" value={funding?.interest_count ? String(funding.interest_count) : undefined} />
                  <Detail icon={DollarSign} label="Last round" value={fmtMoney(funding?.last_round_amount)} />
                  <Detail icon={CalendarDays} label="Last round date" value={fmtDate(funding?.last_round_date)} />
                  <Detail icon={Users} label="Last round investor" value={funding?.last_round_investor_type || undefined} />
                  <Detail icon={Clock} label="Timeline" value={funding?.timeline || undefined} />
                </div>

                {hasAllocation && (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center gap-2 text-white/70">
                      <PieChart className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Use of funds</h4>
                    </div>
                    <div className="space-y-3">
                      <AllocationBar label="Product" pct={funding?.use_product_pct} />
                      <AllocationBar label="Team" pct={funding?.use_team_pct} />
                      <AllocationBar label="Marketing" pct={funding?.use_marketing_pct} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PublicProfile;

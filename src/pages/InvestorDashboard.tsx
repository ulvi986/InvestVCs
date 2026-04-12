import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/context/LanguageContext";
import { Shield, TrendingUp, TrendingDown, Search, Globe, Layers, ChevronDown, ChevronUp, DollarSign, Wallet, Target, AlertTriangle, Users as UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { computeVCValuation, computeChicagoValuation } from "@/lib/valuationUtils";
import type { VCAnswers, ChicagoAnswers } from "@/context/StartupContext";

interface ProfileRow {
  id: string;
  name: string;
  surname: string;
  startup_name: string;
  startup_description: string | null;
  country: string | null;
  industry: string | null;
  created_at: string;
}

interface EvalRow {
  user_id: string;
  berkus: number;
  scorecard: number;
  risk_factor: number;
  vc_answers: VCAnswers;
  chicago_answers: ChicagoAnswers;
}

interface ReadinessRow {
  user_id: string;
  trl_answers: Record<string, boolean>;
  crl_answers: Record<string, boolean>;
  frl_answers: Record<string, boolean>;
}

interface FinancialSnapshotRow {
  user_id: string;
  date: string;
  data: any;
}

const TRL_CRITERIA = [[1,2],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const CRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const FRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];

function getFinalLevel(answers: Record<string, boolean>, prefix: string, count: number, criteria: number[][]): number {
  let finalLevel = 0;
  for (let lvl = 1; lvl <= count; lvl++) {
    const [mCount] = criteria[lvl - 1] || [2, 1];
    const allM = Array.from({ length: mCount }, (_, i) => answers[`${prefix}-${lvl}-M-${i}`] === true).every(Boolean);
    if (allM) finalLevel = lvl;
    else break;
  }
  return finalLevel;
}

function numFmt(v: number | null | undefined): string {
  if (v == null || !isFinite(v) || isNaN(v)) return "—";
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const InvestorDashboard = () => {
  const { isInvestor, isInvestorPending, loading: roleLoading } = useUserRole();
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvalRow[]>([]);
  const [readiness, setReadiness] = useState<ReadinessRow[]>([]);
  const [financials, setFinancials] = useState<FinancialSnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (roleLoading || !isInvestor) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const [pRes, eRes, rRes, fRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("evaluations").select("*"),
        supabase.from("readiness_answers").select("*"),
        supabase.from("financial_snapshots").select("*"),
      ]);
      setProfiles((pRes.data as any[]) ?? []);
      setEvaluations((eRes.data as any[]) ?? []);
      setReadiness((rRes.data as any[]) ?? []);
      setFinancials((fRes.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [isInvestor, roleLoading]);

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">{t("common.loading")}</div>
      </DashboardLayout>
    );
  }

  if (isInvestorPending) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center max-w-md">
            <Shield className="h-16 w-16 text-amber-500/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("investor.pending_title")}</h2>
            <p className="text-muted-foreground">{t("investor.pending_desc")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isInvestor) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-destructive/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("investor.denied_title")}</h2>
            <p className="text-muted-foreground">{t("investor.denied_desc")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const filtered = profiles.filter((p) => {
    if (p.startup_name === "Investor") return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.startup_name.toLowerCase().includes(s) ||
      p.name.toLowerCase().includes(s) ||
      p.surname.toLowerCase().includes(s) ||
      (p.country ?? "").toLowerCase().includes(s) ||
      (p.industry ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <DashboardLayout title={t("investor.title")} subtitle={t("investor.desc")}>
      <div className="space-y-6">

        <div className="mb-6 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("investor.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">{t("investor.no_startups")}</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((profile) => {
              const evalData = evaluations.find((e) => e.user_id === profile.id);
              const readData = readiness.find((r) => r.user_id === profile.id);
              const userFinancials = financials
                .filter((f) => f.user_id === profile.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const latestFinancial = userFinancials[0]?.data;

              const trl = readData ? getFinalLevel(readData.trl_answers, "TRL", 9, TRL_CRITERIA) : 0;
              const crl = readData ? getFinalLevel(readData.crl_answers, "CRL", 9, CRL_CRITERIA) : 0;
              const frl = readData ? getFinalLevel(readData.frl_answers, "FRL", 9, FRL_CRITERIA) : 0;

              const berkus = evalData?.berkus ?? null;
              const scorecard = evalData?.scorecard ?? null;
              const riskFactor = evalData?.risk_factor ?? null;

              const vals = [berkus, scorecard, riskFactor].filter((v): v is number => v != null && v > 0);
              const weightedAvg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

              const getStatus = (level: number) =>
                level >= 9 ? t("investor.completed") : level >= 5 ? t("investor.advanced") : level >= 1 ? t("investor.in_progress") : t("investor.not_started");

              const isExpanded = expandedId === profile.id;

              return (
                <div key={profile.id} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                    className="w-full p-6 text-left hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-foreground">{profile.startup_name}</h3>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{profile.name} {profile.surname}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {profile.country && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {profile.country}
                            </span>
                          )}
                          {profile.industry && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1">
                              <Layers className="h-3 w-3" /> {profile.industry}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">{t("investor.weighted_avg")}</p>
                        <p className="text-xl font-bold text-primary">{numFmt(weightedAvg)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("investor.joined")} {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-6 space-y-6">
                      {profile.startup_description && (
                        <p className="text-sm text-muted-foreground max-w-2xl">{profile.startup_description}</p>
                      )}

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">{t("investor.preseed_methods")}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{t("investor.berkus")}</p>
                            <p className="text-2xl font-bold text-primary">{numFmt(berkus)}</p>
                          </div>
                          <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{t("investor.scorecard")}</p>
                            <p className="text-2xl font-bold text-primary">{numFmt(scorecard)}</p>
                          </div>
                          <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{t("investor.risk_factor")}</p>
                            <p className="text-2xl font-bold text-primary">{numFmt(riskFactor)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">{t("investor.weighted_avg_val")}</p>
                        <p className="text-3xl font-bold text-primary">{numFmt(weightedAvg)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("investor.based_on")} {vals.length} {t("investor.methods")}</p>
                      </div>

                      {/* Financial Overview */}
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          {t("investor.financial")}
                        </h4>
                        {latestFinancial ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <TrendingUp className="h-3 w-3 text-accent" />
                                <p className="text-xs text-muted-foreground">{t("investor.revenue")}</p>
                              </div>
                              <p className="text-lg font-bold text-foreground">{numFmt(latestFinancial.revenue?.total)}</p>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <TrendingDown className="h-3 w-3 text-destructive" />
                                <p className="text-xs text-muted-foreground">{t("investor.expenses")}</p>
                              </div>
                              <p className="text-lg font-bold text-foreground">{numFmt(latestFinancial.expenses?.total)}</p>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Wallet className="h-3 w-3 text-primary" />
                                <p className="text-xs text-muted-foreground">{t("summary.ending_cash")}</p>
                              </div>
                              <p className="text-lg font-bold text-foreground">{numFmt(latestFinancial.cashFlow?.endingCash)}</p>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <UsersIcon className="h-3 w-3 text-accent" />
                                <p className="text-xs text-muted-foreground">{t("summary.active_users")}</p>
                              </div>
                              <p className="text-lg font-bold text-foreground">{latestFinancial.customerMetrics?.activeUsers ?? "—"}</p>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <DollarSign className="h-3 w-3 text-accent" />
                                <p className="text-xs text-muted-foreground">ARPU</p>
                              </div>
                              <p className="text-lg font-bold text-foreground">{numFmt(latestFinancial.customerMetrics?.arpu)}</p>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                                <p className="text-xs text-muted-foreground">{t("investor.burn_rate")}</p>
                              </div>
                              <p className="text-lg font-bold text-foreground">{numFmt(latestFinancial.cashFlow?.monthlyBurnRate)}</p>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Target className="h-3 w-3 text-primary" />
                                <p className="text-xs text-muted-foreground">CLTV</p>
                              </div>
                              <p className="text-lg font-bold text-foreground">{numFmt(latestFinancial.customerMetrics?.cltv)}</p>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Wallet className="h-3 w-3 text-accent" />
                                <p className="text-xs text-muted-foreground">{t("investor.runway")}</p>
                              </div>
                              <p className="text-lg font-bold text-foreground">
                                {latestFinancial.cashFlow?.runway != null
                                  ? `${Math.round(latestFinancial.cashFlow.runway)} ${t("investor.months")}`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{t("investor.no_financial")}</p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">{t("investor.readiness")}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <ReadinessCard label={t("investor.trl")} level={trl} status={getStatus(trl)} />
                          <ReadinessCard label={t("investor.crl")} level={crl} status={getStatus(crl)} />
                          <ReadinessCard label={t("investor.frl")} level={frl} status={getStatus(frl)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

function ReadinessCard({ label, level, status }: { label: string; level: number; status: string }) {
  const pct = (level / 9) * 100;
  const color = level >= 7 ? "bg-green-500" : level >= 4 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="rounded-lg border border-border p-4 bg-muted/30">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{level}/9</p>
      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{status}</p>
    </div>
  );
}

export default InvestorDashboard;

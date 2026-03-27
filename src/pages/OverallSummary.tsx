import DashboardLayout from "@/components/DashboardLayout";
import { useStartupContext } from "@/context/StartupContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Cpu, ShoppingCart, Landmark, Lightbulb,
  AlertTriangle, CheckCircle, DollarSign, Users, Wallet, Target, Gauge
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

const TRL_COUNT = 9;
const CRL_COUNT = 9;
const FRL_COUNT = 9;

const TRL_CRITERIA = [[1,2],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const CRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const FRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];

function getFinalLevelFromAnswers(answers: Record<string, boolean>, prefix: string, levelCount: number, criteriaCounts: number[][]): number {
  let finalLevel = 0;
  for (let lvl = 1; lvl <= levelCount; lvl++) {
    const [mCount] = criteriaCounts[lvl - 1] || [2, 1];
    const allM = Array.from({ length: mCount }, (_, i) => answers[`${prefix}-${lvl}-M-${i}`] === true).every(Boolean);
    if (allM) finalLevel = lvl;
    else break;
  }
  return finalLevel;
}

type Tip = { icon: typeof Lightbulb; title: string; text: string; type: "info" | "success" | "warning" };

const numFmt = (v: number | null | undefined) => {
  if (v === null || v === undefined || !isFinite(v) || isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const CircularGauge = ({ value, max, label, size = 90 }: { value: number; max: number; label: string; size?: number }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;
  const getColor = (pct: number) => {
    if (pct >= 70) return "hsl(172, 66%, 50%)";
    if (pct >= 40) return "hsl(45, 93%, 58%)";
    if (pct > 0) return "hsl(0, 84%, 60%)";
    return "hsl(220, 10%, 30%)";
  };
  const color = getColor(percentage);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" opacity="0.3" />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xl font-bold text-foreground">{Math.round(percentage)}</span>
      </div>
      <span className="text-xs font-medium text-muted-foreground mt-1">{label}</span>
    </div>
  );
};

const GlobalGauge = ({ score, label }: { score: number; label: string }) => {
  const size = 140;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const center = size / 2;
  const getColor = (s: number) => {
    if (s >= 70) return "hsl(172, 66%, 50%)";
    if (s >= 40) return "hsl(45, 93%, 58%)";
    if (s > 0) return "hsl(0, 84%, 60%)";
    return "hsl(220, 10%, 30%)";
  };
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" opacity="0.2" />
          <circle cx={center} cy={center} r={radius} fill="none" stroke={getColor(score)} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-foreground">{Math.round(score)}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-primary mt-2">{label}</p>
    </div>
  );
};

const OverallSummary = () => {
  const { evaluation, financial, readiness } = useStartupContext();
  const { berkus, scorecard, riskFactor } = evaluation;
  const { snapshots } = financial;
  const { trlAnswers, crlAnswers, frlAnswers } = readiness;
  const { t } = useLanguage();

  const trlLevel = useMemo(() => getFinalLevelFromAnswers(trlAnswers, "TRL", TRL_COUNT, TRL_CRITERIA), [trlAnswers]);
  const crlLevel = useMemo(() => getFinalLevelFromAnswers(crlAnswers, "CRL", CRL_COUNT, CRL_CRITERIA), [crlAnswers]);
  const frlLevel = useMemo(() => getFinalLevelFromAnswers(frlAnswers, "FRL", FRL_COUNT, FRL_CRITERIA), [frlAnswers]);

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const avgValuation = useMemo(() => {
    const vals = [berkus, scorecard, riskFactor].filter(v => v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [berkus, scorecard, riskFactor]);

  const hasEvaluation = berkus > 0 || scorecard > 0 || riskFactor > 0;
  const hasFinancial = snapshots.length > 0;
  const hasReadiness = trlLevel > 0 || crlLevel > 0 || frlLevel > 0;
  const hasAnyData = hasEvaluation || hasFinancial || hasReadiness;

  const financialScore = useMemo(() => {
    if (!latestSnapshot) return 0;
    let s = 0;
    if (latestSnapshot.revenue.total > latestSnapshot.expenses.total) s += 30;
    else if (latestSnapshot.revenue.total > 0) s += 15;
    if (latestSnapshot.cashFlow.runway > 12) s += 25;
    else if (latestSnapshot.cashFlow.runway > 6) s += 15;
    else if (latestSnapshot.cashFlow.runway > 0) s += 5;
    if (latestSnapshot.customerMetrics.churnRate < 0.05) s += 20;
    else if (latestSnapshot.customerMetrics.churnRate < 0.1) s += 10;
    if (latestSnapshot.customerMetrics.grossMargin > 0.6) s += 25;
    else if (latestSnapshot.customerMetrics.grossMargin > 0.3) s += 15;
    else if (latestSnapshot.customerMetrics.grossMargin > 0) s += 5;
    return Math.min(s, 100);
  }, [latestSnapshot]);

  const riskScore = useMemo(() => {
    if (!hasEvaluation) return 0;
    return Math.min(Math.round((avgValuation / 2500000) * 100), 100);
  }, [hasEvaluation, avgValuation]);

  const trlScore = Math.round((trlLevel / TRL_COUNT) * 100);
  const founderScore = useMemo(() => Math.round((crlLevel / CRL_COUNT) * 100), [crlLevel]);
  const investmentScore = useMemo(() => Math.round((frlLevel / FRL_COUNT) * 100), [frlLevel]);

  const maturityScore = useMemo(() => {
    const scores = [financialScore, riskScore, trlScore, founderScore, investmentScore];
    const active = scores.filter(s => s > 0);
    return active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length * 0.6) : 0;
  }, [financialScore, riskScore, trlScore, founderScore, investmentScore]);

  const globalScore = useMemo(() => {
    const all = [financialScore, riskScore, trlScore, founderScore, investmentScore, maturityScore];
    const active = all.filter(s => s > 0);
    return active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : 0;
  }, [financialScore, riskScore, trlScore, founderScore, investmentScore, maturityScore]);

  const modules = [
    { name: t("summary.financial"), score: financialScore },
    { name: t("summary.risk"), score: riskScore },
    { name: "TRL", score: trlScore },
    { name: t("summary.founder"), score: founderScore },
    { name: t("summary.investment"), score: investmentScore },
    { name: t("summary.maturity_label"), score: maturityScore },
  ];

  const barColors = modules.map(m => {
    if (m.score >= 70) return "hsl(172, 66%, 50%)";
    if (m.score >= 40) return "hsl(45, 93%, 58%)";
    if (m.score > 0) return "hsl(0, 84%, 60%)";
    return "hsl(220, 10%, 30%)";
  });

  const getMaturityLabel = (score: number): string => {
    if (score >= 80) return t("summary.scale_up");
    if (score >= 60) return t("summary.growth");
    if (score >= 40) return t("summary.validation");
    if (score >= 20) return t("summary.mvp");
    return t("summary.idea");
  };

  const trlLabels = Array.from({ length: 9 }, (_, i) => t(`trl.${i + 1}.title`));
  const crlLabels = Array.from({ length: 9 }, (_, i) => t(`crl.${i + 1}.title`));
  const frlLabels = Array.from({ length: 9 }, (_, i) => t(`frl.${i + 1}.title`));

  const advice = useMemo((): Tip[] => {
    const tips: Tip[] = [];
    if (!hasAnyData) {
      tips.push({ icon: AlertTriangle, title: t("summary.no_data"), text: t("summary.no_data_desc"), type: "warning" });
      return tips;
    }
    if (hasEvaluation) {
      if (avgValuation < 1_000_000) tips.push({ icon: AlertTriangle, title: t("summary.low_val"), text: `$${numFmt(avgValuation)} — ${t("summary.low_val_desc")}`, type: "warning" });
      else if (avgValuation < 2_500_000) tips.push({ icon: Lightbulb, title: t("summary.mod_val"), text: `$${numFmt(avgValuation)} — ${t("summary.mod_val_desc")}`, type: "info" });
      else tips.push({ icon: CheckCircle, title: t("summary.strong_val"), text: `$${numFmt(avgValuation)} — ${t("summary.strong_val_desc")}`, type: "success" });
    }
    if (hasFinancial && latestSnapshot) {
      const burnRate = latestSnapshot.revenue.total - latestSnapshot.expenses.total;
      if (burnRate < 0) tips.push({ icon: AlertTriangle, title: t("summary.neg_cashflow"), text: `$${numFmt(Math.abs(burnRate))}/mo. ~${numFmt(latestSnapshot.cashFlow.runway)} ${t("financial.months")} runway.`, type: "warning" });
      else tips.push({ icon: CheckCircle, title: t("summary.pos_cashflow"), text: `$${numFmt(burnRate)}/mo`, type: "success" });
      if (latestSnapshot.customerMetrics.churnRate > 0.1) tips.push({ icon: AlertTriangle, title: t("summary.high_churn"), text: `${numFmt(latestSnapshot.customerMetrics.churnRate * 100)}%`, type: "warning" });
    }
    if (hasReadiness) {
      if (trlLevel >= 5 && crlLevel < 3) tips.push({ icon: AlertTriangle, title: t("summary.tech_market_gap"), text: t("summary.tech_market_gap_desc"), type: "warning" });
      if (crlLevel >= 4 && frlLevel < 3) tips.push({ icon: Lightbulb, title: t("summary.funding_needed"), text: t("summary.funding_needed_desc"), type: "info" });
    }
    if (hasEvaluation && hasFinancial && hasReadiness && globalScore > 60) tips.push({ icon: Target, title: t("summary.ready_invest"), text: t("summary.ready_invest_desc"), type: "success" });
    if (!hasEvaluation) tips.push({ icon: Lightbulb, title: t("summary.complete_eval"), text: t("summary.complete_eval_desc"), type: "info" });
    if (!hasFinancial) tips.push({ icon: Lightbulb, title: t("summary.add_financial"), text: t("summary.add_financial_desc"), type: "info" });
    if (!hasReadiness) tips.push({ icon: Lightbulb, title: t("summary.assess_readiness"), text: t("summary.assess_readiness_desc"), type: "info" });
    return tips;
  }, [hasAnyData, hasEvaluation, hasFinancial, hasReadiness, avgValuation, latestSnapshot, trlLevel, crlLevel, frlLevel, globalScore, t]);

  const typeStyles = { info: "border-primary/20 bg-primary/5", success: "border-accent/20 bg-accent/5", warning: "border-destructive/20 bg-destructive/5" };
  const iconStyles = { info: "text-primary", success: "text-accent", warning: "text-destructive" };

  return (
    <DashboardLayout title={t("summary.title")} subtitle={t("summary.subtitle")}>
      {hasReadiness && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> {t("summary.readiness_levels")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: t("summary.technology_trl"), level: trlLevel, max: TRL_COUNT, color: "text-primary", labels: trlLabels },
              { label: t("summary.commercial_crl"), level: crlLevel, max: CRL_COUNT, color: "text-accent", labels: crlLabels },
              { label: t("summary.funding_frl"), level: frlLevel, max: FRL_COUNT, color: "text-purple-500", labels: frlLabels },
            ].map((r) => (
              <div key={r.label} className="rounded-lg border border-border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">{r.label}</p>
                <p className={`text-2xl font-bold ${r.color}`}>{r.level} / {r.max}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.level > 0 ? r.labels[r.level - 1] : t("summary.not_started")}</p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(r.level / r.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-8 shadow-card mb-8 flex flex-col items-center">
        <GlobalGauge score={globalScore} label={t("summary.global_health")} />
        <p className="mt-3 text-lg font-semibold text-foreground">
          {t("summary.maturity")}: <span className="text-primary">{getMaturityLabel(globalScore)}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {modules.map((mod) => (
          <div key={mod.name} className="rounded-xl border border-border bg-card p-5 shadow-card flex flex-col items-center relative">
            <CircularGauge value={mod.score} max={100} label={mod.name} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">{t("summary.module_comparison")}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={modules} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {modules.map((_, i) => (<Cell key={i} fill={barColors[i]} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {hasFinancial && latestSnapshot && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t("summary.financial_report")}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("summary.total_revenue"), value: `$${numFmt(latestSnapshot.revenue.total)}`, icon: TrendingUp, positive: true },
              { label: t("summary.total_expenses"), value: `$${numFmt(latestSnapshot.expenses.total)}`, icon: TrendingDown, positive: false },
              { label: t("summary.ending_cash"), value: `$${numFmt(latestSnapshot.cashFlow.endingCash)}`, icon: Wallet, positive: latestSnapshot.cashFlow.endingCash > 0 },
              { label: t("summary.active_users"), value: numFmt(latestSnapshot.customerMetrics.activeUsers), icon: Users, positive: true },
              { label: "ARPU", value: `$${numFmt(latestSnapshot.customerMetrics.arpu)}`, icon: DollarSign, positive: true },
              { label: t("summary.churn_rate"), value: `${numFmt(latestSnapshot.customerMetrics.churnRate * 100)}%`, icon: AlertTriangle, positive: latestSnapshot.customerMetrics.churnRate < 0.05 },
              { label: t("summary.burn_rate"), value: `$${numFmt(latestSnapshot.cashFlow.monthlyBurnRate)}`, icon: TrendingDown, positive: latestSnapshot.cashFlow.monthlyBurnRate > 0 },
              { label: "CLTV", value: `$${numFmt(latestSnapshot.customerMetrics.cltv)}`, icon: Target, positive: true },
            ].map(metric => (
              <div key={metric.label} className="rounded-lg border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <metric.icon className={`h-4 w-4 ${metric.positive ? "text-accent" : "text-destructive"}`} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasEvaluation && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t("summary.valuation_results")}</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { method: t("eval_summary.berkus"), value: berkus, color: "text-primary" },
              { method: t("eval_summary.scorecard"), value: scorecard, color: "text-accent" },
              { method: t("eval_summary.risk_factor"), value: riskFactor, color: "text-purple-500" },
            ].map(v => (
              <div key={v.method} className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">{v.method}</p>
                <p className={`text-xl font-bold ${v.color}`}>${v.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">{t("summary.avg_valuation")}</p>
            <p className="text-2xl font-bold text-primary">${avgValuation.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-foreground mb-4">{t("summary.recommendations")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {advice.map((tip, i) => (
            <div key={i} className={`rounded-xl border p-5 ${typeStyles[tip.type]}`}>
              <div className="flex items-start gap-3">
                <tip.icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconStyles[tip.type]}`} />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{tip.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{tip.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OverallSummary;

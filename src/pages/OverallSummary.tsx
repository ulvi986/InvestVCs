import Layout from "@/components/Layout";
import { useStartupContext } from "@/context/StartupContext";
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
const CRL_COUNT = 7;
const FRL_COUNT = 9;

const TRL_CRITERIA = [[1,2],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const CRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const FRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];

function getFinalLevelFromAnswers(answers: Record<string, boolean>, prefix: string, levelCount: number, criteriaCounts: number[][]): number {
  let finalLevel = 0;
  for (let lvl = 1; lvl <= levelCount; lvl++) {
    const [mCount, sCount] = criteriaCounts[lvl - 1] || [2, 1];
    const allM = Array.from({ length: mCount }, (_, i) => answers[`${prefix}-${lvl}-M-${i}`] === true).every(Boolean);
    const sMet = Array.from({ length: sCount }, (_, i) => answers[`${prefix}-${lvl}-S-${i}`] === true).filter(Boolean).length;
    const sRequired = Math.ceil(sCount * 0.7);
    if (allM && (sCount === 0 || sMet >= sRequired)) {
      finalLevel = lvl;
    } else {
      break;
    }
  }
  return finalLevel;
}

type Tip = { icon: typeof Lightbulb; title: string; text: string; type: "info" | "success" | "warning" };

const numFmt = (v: number) => {
  if (!isFinite(v) || isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

// Circular gauge SVG component
const CircularGauge = ({ value, max, label, size = 90 }: { value: number; max: number; label: string; size?: number }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  // Color based on percentage
  const getColor = (pct: number) => {
    if (pct >= 70) return "hsl(172, 66%, 50%)"; // accent green
    if (pct >= 40) return "hsl(45, 93%, 58%)";  // amber/orange
    if (pct > 0) return "hsl(0, 84%, 60%)";     // red
    return "hsl(220, 10%, 30%)";                  // gray
  };

  const color = getColor(percentage);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="6"
          opacity="0.3"
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xl font-bold text-foreground">{Math.round(percentage)}</span>
      </div>
      <span className="text-xs font-medium text-muted-foreground mt-1">{label}</span>
    </div>
  );
};

// Large central gauge
const GlobalGauge = ({ score }: { score: number }) => {
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
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            opacity="0.2"
          />
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke={getColor(score)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-foreground">{Math.round(score)}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-primary mt-2">Global Health Score</p>
    </div>
  );
};

const getMaturityLabel = (score: number): string => {
  if (score >= 80) return "Scale-Up";
  if (score >= 60) return "Growth";
  if (score >= 40) return "Validation";
  if (score >= 20) return "MVP";
  return "Idea";
};

const OverallSummary = () => {
  const { evaluation, financial, readiness } = useStartupContext();
  const { berkus, scorecard, riskFactor } = evaluation;
  const { snapshots } = financial;
  const { trlAnswers, crlAnswers, frlAnswers } = readiness;

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

  // Module scores (0-100)
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
    const maxVal = 2500000;
    return Math.min(Math.round((avgValuation / maxVal) * 100), 100);
  }, [hasEvaluation, avgValuation]);

  const trlScore = Math.round((trlLevel / TRL_COUNT) * 100);
  
  const founderScore = useMemo(() => {
    // Based on commercial readiness as proxy for founder execution
    return Math.round((crlLevel / CRL_COUNT) * 100);
  }, [crlLevel]);

  const investmentScore = useMemo(() => {
    return Math.round((frlLevel / FRL_COUNT) * 100);
  }, [frlLevel]);

  const maturityScore = useMemo(() => {
    const scores = [financialScore, riskScore, trlScore, founderScore, investmentScore];
    const active = scores.filter(s => s > 0);
    return active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length * 0.6) : 0;
  }, [financialScore, riskScore, trlScore, founderScore, investmentScore]);

  // Global health score
  const globalScore = useMemo(() => {
    const all = [financialScore, riskScore, trlScore, founderScore, investmentScore, maturityScore];
    const active = all.filter(s => s > 0);
    return active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : 0;
  }, [financialScore, riskScore, trlScore, founderScore, investmentScore, maturityScore]);

  const modules = [
    { name: "Financial", score: financialScore },
    { name: "Risk", score: riskScore },
    { name: "TRL", score: trlScore },
    { name: "Founder", score: founderScore },
    { name: "Investment", score: investmentScore },
    { name: "Maturity", score: maturityScore },
  ];

  const barColors = modules.map(m => {
    if (m.score >= 70) return "hsl(172, 66%, 50%)";
    if (m.score >= 40) return "hsl(45, 93%, 58%)";
    if (m.score > 0) return "hsl(0, 84%, 60%)";
    return "hsl(220, 10%, 30%)";
  });

  // Advice engine
  const advice = useMemo((): Tip[] => {
    const tips: Tip[] = [];

    if (!hasAnyData) {
      tips.push({ icon: AlertTriangle, title: "No Data Available", text: "Please complete at least one section to see personalized advice.", type: "warning" });
      return tips;
    }

    if (hasEvaluation) {
      if (avgValuation < 1_000_000) {
        tips.push({ icon: AlertTriangle, title: "Low Valuation", text: `Average valuation is $${numFmt(avgValuation)}. Strengthen team, market fit, and prototype.`, type: "warning" });
      } else if (avgValuation < 2_500_000) {
        tips.push({ icon: Lightbulb, title: "Moderate Valuation", text: `$${numFmt(avgValuation)} shows promise. Strengthen partnerships and sales channels.`, type: "info" });
      } else {
        tips.push({ icon: CheckCircle, title: "Strong Valuation", text: `$${numFmt(avgValuation)} indicates strong potential for investor discussions.`, type: "success" });
      }
    }

    if (hasFinancial && latestSnapshot) {
      const burnRate = latestSnapshot.revenue.total - latestSnapshot.expenses.total;
      if (burnRate < 0) {
        tips.push({ icon: AlertTriangle, title: "Negative Cash Flow", text: `Burning $${numFmt(Math.abs(burnRate))}/mo. ~${numFmt(latestSnapshot.cashFlow.runway)} months runway.`, type: "warning" });
      } else {
        tips.push({ icon: CheckCircle, title: "Positive Cash Flow", text: `Generating $${numFmt(burnRate)}/mo — strong investor signal.`, type: "success" });
      }
      if (latestSnapshot.customerMetrics.churnRate > 0.1) {
        tips.push({ icon: AlertTriangle, title: "High Churn Rate", text: `${numFmt(latestSnapshot.customerMetrics.churnRate * 100)}% churn. Target below 5-7%.`, type: "warning" });
      }
    }

    if (hasReadiness) {
      if (trlLevel >= 5 && crlLevel < 3) {
        tips.push({ icon: AlertTriangle, title: "Technology-Market Gap", text: "Advanced tech but low commercial readiness. Prioritize customer discovery.", type: "warning" });
      }
      if (crlLevel >= 4 && frlLevel < 3) {
        tips.push({ icon: Lightbulb, title: "Funding Preparation Needed", text: "Commercial traction exists — build pitch deck and financial projections.", type: "info" });
      }
    }

    if (hasEvaluation && hasFinancial && hasReadiness && globalScore > 60) {
      tips.push({ icon: Target, title: "Ready for Investment Round", text: "Your overall score suggests readiness for seed or Series A round.", type: "success" });
    }

    if (!hasEvaluation) tips.push({ icon: Lightbulb, title: "Complete Startup Evaluation", text: "Run Berkus, Scorecard, and Risk Factor methods.", type: "info" });
    if (!hasFinancial) tips.push({ icon: Lightbulb, title: "Add Financial Data", text: "Track revenue, expenses, and key metrics.", type: "info" });
    if (!hasReadiness) tips.push({ icon: Lightbulb, title: "Assess Readiness Levels", text: "Complete TRL, CRL, and FRL assessments.", type: "info" });

    return tips;
  }, [hasAnyData, hasEvaluation, hasFinancial, hasReadiness, avgValuation, latestSnapshot, trlLevel, crlLevel, frlLevel, globalScore]);

  const typeStyles = {
    info: "border-primary/20 bg-primary/5",
    success: "border-accent/20 bg-accent/5",
    warning: "border-destructive/20 bg-destructive/5",
  };
  const iconStyles = {
    info: "text-primary",
    success: "text-accent",
    warning: "text-destructive",
  };

  return (
    <Layout>
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Overall Summary & Advice</h1>
          <p className="mt-2 text-muted-foreground">
            Comprehensive overview based on all available data.
          </p>
        </div>

        {/* Global Health Score */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card mb-8 flex flex-col items-center">
          <GlobalGauge score={globalScore} />
          <p className="mt-3 text-lg font-semibold text-foreground">
            Startup Maturity: <span className="text-primary">{getMaturityLabel(globalScore)}</span>
          </p>
        </div>

        {/* Module Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {modules.map((mod) => (
            <div
              key={mod.name}
              className="rounded-xl border border-border bg-card p-5 shadow-card flex flex-col items-center relative"
            >
              <CircularGauge value={mod.score} max={100} label={mod.name} />
            </div>
          ))}
        </div>

        {/* Module Comparison Bar Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Module Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modules} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {modules.map((_, i) => (
                  <Cell key={i} fill={barColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Financial Snapshot Summary */}
        {hasFinancial && latestSnapshot && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Latest Financial Report</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Revenue", value: `$${numFmt(latestSnapshot.revenue.total)}`, icon: TrendingUp, positive: true },
                { label: "Total Expenses", value: `$${numFmt(latestSnapshot.expenses.total)}`, icon: TrendingDown, positive: false },
                { label: "Ending Cash", value: `$${numFmt(latestSnapshot.cashFlow.endingCash)}`, icon: Wallet, positive: latestSnapshot.cashFlow.endingCash > 0 },
                { label: "Active Users", value: numFmt(latestSnapshot.customerMetrics.activeUsers), icon: Users, positive: true },
                { label: "ARPU", value: `$${numFmt(latestSnapshot.customerMetrics.arpu)}`, icon: DollarSign, positive: true },
                { label: "Churn Rate", value: `${numFmt(latestSnapshot.customerMetrics.churnRate * 100)}%`, icon: AlertTriangle, positive: latestSnapshot.customerMetrics.churnRate < 0.05 },
                { label: "Burn Rate", value: `$${numFmt(latestSnapshot.cashFlow.monthlyBurnRate)}`, icon: TrendingDown, positive: latestSnapshot.cashFlow.monthlyBurnRate > 0 },
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

        {/* Valuation Summary */}
        {hasEvaluation && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Valuation Results</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { method: "Berkus", value: berkus, color: "text-primary" },
                { method: "Scorecard", value: scorecard, color: "text-accent" },
                { method: "Risk Factor", value: riskFactor, color: "text-purple-500" },
              ].map(v => (
                <div key={v.method} className="rounded-lg border border-border p-4 bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{v.method}</p>
                  <p className={`text-xl font-bold ${v.color}`}>${v.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-sm text-muted-foreground">Average Valuation</p>
              <p className="text-2xl font-bold text-primary">${avgValuation.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Advice */}
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">💡 Tövsiyələr</h3>
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
      </div>
    </Layout>
  );
};

export default OverallSummary;

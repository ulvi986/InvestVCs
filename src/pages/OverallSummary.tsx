import Layout from "@/components/Layout";
import { useStartupContext } from "@/context/StartupContext";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Cpu, ShoppingCart, Landmark, Lightbulb, AlertTriangle, CheckCircle, DollarSign, Users, Wallet, Target, Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

// Readiness level data (duplicated for calculation - same as ReadinessLevel.tsx)
const TRL_COUNT = 9;
const CRL_COUNT = 7;
const FRL_COUNT = 9;

type Level = { level: number; criteria: { type: "M" | "S"; text: string }[] };

// Minimal level definitions for calculation
const makeLevels = (count: number, criteriaPerLevel: number[][]): Level[] =>
  Array.from({ length: count }, (_, i) => ({
    level: i + 1,
    criteria: (criteriaPerLevel[i] || [2, 1]).map((_, j) =>
      j < (criteriaPerLevel[i]?.[0] ?? 2) ? { type: "M" as const, text: "" } : { type: "S" as const, text: "" }
    ),
  }));

// TRL: each level has M and S counts
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

  // Radar chart data
  const radarData = [
    { subject: "TRL", value: (trlLevel / TRL_COUNT) * 100, fullMark: 100 },
    { subject: "CRL", value: (crlLevel / CRL_COUNT) * 100, fullMark: 100 },
    { subject: "FRL", value: (frlLevel / FRL_COUNT) * 100, fullMark: 100 },
    { subject: "Valuation", value: avgValuation > 0 ? Math.min((avgValuation / 5_000_000) * 100, 100) : 0, fullMark: 100 },
    { subject: "Revenue", value: latestSnapshot ? Math.min((latestSnapshot.revenue.total / 100_000) * 100, 100) : 0, fullMark: 100 },
    { subject: "Customers", value: latestSnapshot ? Math.min((latestSnapshot.customerMetrics.activeUsers / 100) * 100, 100) : 0, fullMark: 100 },
  ];

  const valuationChartData = [
    { method: "Berkus", value: berkus },
    { method: "Scorecard", value: scorecard },
    { method: "Risk Factor", value: riskFactor },
  ];
  const valuationColors = ["hsl(217, 91%, 60%)", "hsl(172, 66%, 50%)", "hsl(280, 60%, 55%)"];

  // Generate comprehensive advice
  const advice = useMemo((): Tip[] => {
    const tips: Tip[] = [];

    if (!hasAnyData) {
      tips.push({ icon: AlertTriangle, title: "No Data Available", text: "Please complete at least one section (Startup Evaluation, Financial Management, or Readiness Level) to see personalized advice.", type: "warning" });
      return tips;
    }

    // Valuation advice
    if (hasEvaluation) {
      if (avgValuation < 1_000_000) {
        tips.push({ icon: AlertTriangle, title: "Low Valuation", text: `Your average valuation is $${numFmt(avgValuation)}. Focus on strengthening your team, market fit, and prototype to increase valuation.`, type: "warning" });
      } else if (avgValuation < 2_500_000) {
        tips.push({ icon: Lightbulb, title: "Moderate Valuation", text: `Your average valuation of $${numFmt(avgValuation)} shows promise. Strengthen strategic partnerships and sales channels.`, type: "info" });
      } else {
        tips.push({ icon: CheckCircle, title: "Strong Valuation", text: `Your valuation of $${numFmt(avgValuation)} indicates strong potential. You may be ready for investor discussions.`, type: "success" });
      }
    }

    // Financial advice
    if (hasFinancial && latestSnapshot) {
      const { revenue, expenses, cashFlow, customerMetrics } = latestSnapshot;
      const burnRate = revenue.total - expenses.total;

      if (burnRate < 0) {
        tips.push({ icon: AlertTriangle, title: "Negative Cash Flow", text: `You are burning $${numFmt(Math.abs(burnRate))}/month. With $${numFmt(cashFlow.endingCash)} in cash, you have approximately ${numFmt(cashFlow.runway)} months of runway. Consider reducing expenses or increasing revenue.`, type: "warning" });
      } else {
        tips.push({ icon: CheckCircle, title: "Positive Cash Flow", text: `You are generating $${numFmt(burnRate)}/month in positive cash flow. This is a strong signal for investors.`, type: "success" });
      }

      if (customerMetrics.churnRate > 0.1) {
        tips.push({ icon: AlertTriangle, title: "High Churn Rate", text: `Your churn rate of ${numFmt(customerMetrics.churnRate * 100)}% is concerning. Focus on customer retention and product-market fit to reduce churn below 5-7%.`, type: "warning" });
      }

      if (isFinite(customerMetrics.cac) && isFinite(customerMetrics.cltv) && customerMetrics.cltv > 0) {
        const ratio = customerMetrics.cltv / customerMetrics.cac;
        if (ratio < 3) {
          tips.push({ icon: AlertTriangle, title: "Low CLTV/CAC Ratio", text: `Your CLTV/CAC ratio is ${numFmt(ratio)}x. Aim for at least 3x to ensure sustainable growth. Consider reducing acquisition costs or increasing customer lifetime value.`, type: "warning" });
        } else {
          tips.push({ icon: CheckCircle, title: "Healthy Unit Economics", text: `Your CLTV/CAC ratio of ${numFmt(ratio)}x is healthy, indicating efficient customer acquisition.`, type: "success" });
        }
      }

      if (customerMetrics.grossMargin > 0 && customerMetrics.grossMargin < 0.5) {
        tips.push({ icon: Lightbulb, title: "Improve Gross Margin", text: `Your gross margin is ${numFmt(customerMetrics.grossMargin * 100)}%. Most successful startups target 60-80%. Optimize production costs or pricing.`, type: "info" });
      }
    }

    // Readiness advice
    if (hasReadiness) {
      if (trlLevel < 3) {
        tips.push({ icon: Lightbulb, title: "Early Technology Stage", text: `TRL Level ${trlLevel}/9: Your technology is still in early stages. Focus on building a proof of concept and conducting initial tests before scaling.`, type: "info" });
      } else if (trlLevel >= 6) {
        tips.push({ icon: CheckCircle, title: "Mature Technology", text: `TRL Level ${trlLevel}/9: Your technology is well-developed. You're ready for operational deployment and scaling.`, type: "success" });
      }

      if (crlLevel < 3) {
        tips.push({ icon: Lightbulb, title: "Early Commercial Stage", text: `CRL Level ${crlLevel}/7: Focus on validating your value proposition with real customers and getting your first sale.`, type: "info" });
      } else if (crlLevel >= 5) {
        tips.push({ icon: CheckCircle, title: "Strong Commercial Traction", text: `CRL Level ${crlLevel}/7: You have proven commercial viability with repeat customers and positive unit economics.`, type: "success" });
      }

      if (frlLevel < 3) {
        tips.push({ icon: Lightbulb, title: "Early Funding Stage", text: `FRL Level ${frlLevel}/9: Start by documenting your funding needs and preparing a financial plan.`, type: "info" });
      } else if (frlLevel >= 6) {
        tips.push({ icon: CheckCircle, title: "Investor Ready", text: `FRL Level ${frlLevel}/9: You are well-prepared for investor discussions. Start actively engaging with potential investors.`, type: "success" });
      }

      // Cross-dimensional advice
      if (trlLevel >= 5 && crlLevel < 3) {
        tips.push({ icon: AlertTriangle, title: "Technology-Market Gap", text: "Your technology is advanced but commercial readiness is low. Prioritize customer discovery, MVP testing, and getting your first sales.", type: "warning" });
      }
      if (crlLevel >= 4 && frlLevel < 3) {
        tips.push({ icon: Lightbulb, title: "Funding Preparation Needed", text: "You have commercial traction but haven't prepared for funding. Start building your pitch deck, financial projections, and investor materials.", type: "info" });
      }
    }

    // Combined advice
    if (hasEvaluation && hasFinancial && hasReadiness) {
      const overallScore = ((trlLevel / TRL_COUNT) + (crlLevel / CRL_COUNT) + (frlLevel / FRL_COUNT)) / 3 * 100;
      if (overallScore > 60 && avgValuation > 2_000_000) {
        tips.push({ icon: Target, title: "Ready for Investment Round", text: "Based on your readiness levels, valuation, and financial data, you appear ready to pursue a seed or Series A round. Prepare a comprehensive pitch deck.", type: "success" });
      }
    }

    // Next steps
    if (!hasEvaluation) {
      tips.push({ icon: Lightbulb, title: "Complete Startup Evaluation", text: "Run the Berkus, Scorecard, and Risk Factor methods to get a comprehensive valuation estimate.", type: "info" });
    }
    if (!hasFinancial) {
      tips.push({ icon: Lightbulb, title: "Add Financial Data", text: "Enter your financial data in the Financial Management section to track revenue, expenses, and key metrics.", type: "info" });
    }
    if (!hasReadiness) {
      tips.push({ icon: Lightbulb, title: "Assess Readiness Levels", text: "Complete the TRL, CRL, and FRL assessments to understand your startup's maturity across all dimensions.", type: "info" });
    }

    return tips;
  }, [hasAnyData, hasEvaluation, hasFinancial, hasReadiness, avgValuation, latestSnapshot, trlLevel, crlLevel, frlLevel]);

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
            A comprehensive overview of your startup based on all available data from Evaluation, Financial, and Readiness assessments.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className={`rounded-xl border p-5 ${hasEvaluation ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Startup Evaluation</p>
                {hasEvaluation ? (
                  <p className="text-xs text-accent">Avg: ${avgValuation.toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not completed</p>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-5 ${hasFinancial ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Financial Management</p>
                {hasFinancial ? (
                  <p className="text-xs text-accent">{snapshots.length} snapshot(s) saved</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not completed</p>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-5 ${hasReadiness ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
                <Gauge className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Readiness Level</p>
                {hasReadiness ? (
                  <p className="text-xs text-accent">TRL {trlLevel} · CRL {crlLevel} · FRL {frlLevel}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not completed</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Radar Chart */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Startup Health Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(214, 20%, 90%)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Score" dataKey="value" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Readiness Levels */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Readiness Levels</h3>
            <div className="space-y-5">
              {[
                { label: "Technology (TRL)", level: trlLevel, max: TRL_COUNT, icon: Cpu, color: "hsl(217, 91%, 60%)" },
                { label: "Commercial (CRL)", level: crlLevel, max: CRL_COUNT, icon: ShoppingCart, color: "hsl(172, 66%, 50%)" },
                { label: "Funding (FRL)", level: frlLevel, max: FRL_COUNT, icon: Landmark, color: "hsl(280, 60%, 55%)" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{item.level}/{item.max}</span>
                  </div>
                  <Progress value={(item.level / item.max) * 100} className="h-2.5" />
                </div>
              ))}
            </div>

            {/* Valuation Summary */}
            {hasEvaluation && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Valuation Methods</h4>
                <div className="space-y-2 text-sm">
                  {valuationChartData.map((d, i) => (
                    <div key={d.method} className="flex justify-between">
                      <span className="text-muted-foreground">{d.method}</span>
                      <span className="font-medium" style={{ color: valuationColors[i] }}>${d.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-bold">
                    <span className="text-foreground">Average</span>
                    <span className="text-gradient">${avgValuation.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Snapshot Summary */}
        {hasFinancial && latestSnapshot && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Latest Financial Snapshot</h3>
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

        {/* Advice Section */}
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">💡 Comprehensive Advice & Recommendations</h3>
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

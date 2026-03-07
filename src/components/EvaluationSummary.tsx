import ValuationGauge from "./ValuationGauge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface EvaluationSummaryProps {
  berkus: number;
  scorecard: number;
  riskFactor: number;
}

const colors = [
  "hsl(217, 91%, 60%)",
  "hsl(172, 66%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(45, 93%, 58%)",
];

const getAdvice = (average: number, berkus: number, scorecard: number, riskFactor: number) => {
  const tips: { icon: typeof Lightbulb; title: string; text: string; type: "info" | "success" | "warning" }[] = [];

  if (average === 0) {
    tips.push({
      icon: AlertTriangle,
      title: "No data entered",
      text: "To see results, please complete all three methods first: Berkus, Scorecard, and Risk Factor.",
      type: "warning",
    });
    return tips;
  }

  if (average < 1_000_000) {
    tips.push({
      icon: AlertTriangle,
      title: "Low Valuation",
      text: "Your startup's overall value is relatively low. Focus on strengthening your team, market, and product.",
      type: "warning",
    });
  } else if (average < 2_500_000) {
    tips.push({
      icon: Lightbulb,
      title: "Moderate Valuation",
      text: "Your startup is at a good starting point. Strengthening strategic partnerships and sales channels will increase its value.",
      type: "info",
    });
  } else {
    tips.push({
      icon: CheckCircle,
      title: "Strong Valuation",
      text: "Your startup has high potential. You may be ready for investor discussions.",
      type: "success",
    });
  }

  if (berkus < scorecard * 0.5 && berkus > 0) {
    tips.push({
      icon: AlertTriangle,
      title: "Berkus value is low",
      text: "It is recommended to strengthen early-stage components (prototype, team, strategic partnerships).",
      type: "warning",
    });
  }

  if (riskFactor < average * 0.7 && riskFactor > 0) {
    tips.push({
      icon: AlertTriangle,
      title: "Risk factors are concerning",
      text: "You have high risk indicators in several categories. Prepare a plan to mitigate these risks.",
      type: "warning",
    });
  }

  if (scorecard > berkus && scorecard > riskFactor && scorecard > 0) {
    tips.push({
      icon: TrendingUp,
      title: "Scorecard advantage",
      text: "You appear strong in regional comparison. Highlight this advantage when presenting to investors.",
      type: "success",
    });
  }

  tips.push({
    icon: Lightbulb,
    title: "Next Step",
    text: average > 2_000_000
      ? "Prepare a pitch deck and start investor meetings. Use this valuation as a basis for negotiations."
      : "Move to the preparation phase, strengthen your team, and get to know your market better.",
    type: "info",
  });

  return tips;
};

const EvaluationSummary = ({ berkus, scorecard, riskFactor }: EvaluationSummaryProps) => {
  const average = berkus > 0 || scorecard > 0 || riskFactor > 0
    ? Math.round(([berkus, scorecard, riskFactor].filter(v => v > 0).reduce((a, b) => a + b, 0)) / [berkus, scorecard, riskFactor].filter(v => v > 0).length)
    : 0;

  const chartData = [
    { method: "Berkus", value: berkus },
    { method: "Scorecard", value: scorecard },
    { method: "Risk Factor", value: riskFactor },
    { method: "Average", value: average },
  ];

  const advice = getAdvice(average, berkus, scorecard, riskFactor);

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
    <div className="space-y-8">
      {/* Gauges */}
      <div className="grid gap-6 md:grid-cols-3">
        <ValuationGauge value={berkus} max={2500000} label="Berkus Method" />
        <ValuationGauge value={scorecard} max={6000000} label="Scorecard Method" />
        <ValuationGauge value={riskFactor} max={5000000} label="Risk Factor Method" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="method" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString("en-US")}`} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary + Average */}
        <div className="space-y-6">
          <ValuationGauge value={average} max={5000000} label="Overall Estimated Value (Average)" />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-3">Calculation</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Berkus</span>
                <span className="font-medium text-foreground">${berkus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scorecard</span>
                <span className="font-medium text-foreground">${scorecard.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Factor</span>
                <span className="font-medium text-foreground">${riskFactor.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
                <span className="text-foreground">Average</span>
                <span className="text-gradient">${average.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advice Section */}
      <div>
        <h3 className="text-xl font-bold text-foreground mb-4">💡 Advice & Recommendations</h3>
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
  );
};

export default EvaluationSummary;

import ValuationGauge from "./ValuationGauge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface SeedEvaluationSummaryProps {
  vcMethod: number;
  chicagoMethod: number;
}

const colors = [
  "hsl(217, 91%, 60%)",
  "hsl(172, 66%, 50%)",
  "hsl(45, 93%, 58%)",
];

const getAdvice = (average: number, vc: number, chicago: number) => {
  const tips: { icon: typeof Lightbulb; title: string; text: string; type: "info" | "success" | "warning" }[] = [];

  if (average === 0) {
    tips.push({
      icon: AlertTriangle,
      title: "No data entered",
      text: "To see results, please complete both methods first: VC Method and First Chicago Method.",
      type: "warning",
    });
    return tips;
  }

  if (average < 500_000) {
    tips.push({
      icon: AlertTriangle,
      title: "Low Valuation",
      text: "Your seed-stage valuation is relatively low. Consider revisiting your revenue projections and exit assumptions.",
      type: "warning",
    });
  } else if (average < 3_000_000) {
    tips.push({
      icon: Lightbulb,
      title: "Moderate Valuation",
      text: "Your startup shows promise at the seed stage. Focus on traction metrics and revenue growth to strengthen your position.",
      type: "info",
    });
  } else {
    tips.push({
      icon: CheckCircle,
      title: "Strong Valuation",
      text: "Your seed-stage valuation is strong. You are well-positioned for investor conversations and fundraising.",
      type: "success",
    });
  }

  if (vc > 0 && chicago > 0 && Math.abs(vc - chicago) > average * 0.5) {
    tips.push({
      icon: AlertTriangle,
      title: "Large gap between methods",
      text: "There is a significant difference between your VC Method and First Chicago Method valuations. Review your assumptions for consistency.",
      type: "warning",
    });
  }

  if (vc > chicago && vc > 0 && chicago > 0) {
    tips.push({
      icon: TrendingUp,
      title: "VC Method is higher",
      text: "Your VC Method valuation exceeds the First Chicago Method. This may indicate optimistic exit assumptions — validate with market data.",
      type: "info",
    });
  } else if (chicago > vc && vc > 0 && chicago > 0) {
    tips.push({
      icon: TrendingUp,
      title: "First Chicago Method is higher",
      text: "Your scenario-based valuation is higher. This suggests strong upside potential in your best-case scenarios.",
      type: "success",
    });
  }

  tips.push({
    icon: Lightbulb,
    title: "Next Step",
    text: average > 2_000_000
      ? "Prepare a detailed pitch deck with financial projections. Use these valuations as a negotiation baseline with investors."
      : "Focus on building traction — revenue, users, partnerships. Revisit your valuation as metrics improve.",
    type: "info",
  });

  return tips;
};

const SeedEvaluationSummary = ({ vcMethod, chicagoMethod }: SeedEvaluationSummaryProps) => {
  const values = [vcMethod, chicagoMethod].filter(v => v > 0);
  const average = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  const chartData = [
    { method: "VC Method", value: vcMethod },
    { method: "First Chicago", value: chicagoMethod },
    { method: "Average", value: average },
  ];

  const advice = getAdvice(average, vcMethod, chicagoMethod);

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
      <div className="grid gap-6 md:grid-cols-2">
        <ValuationGauge value={vcMethod} max={10000000} label="VC Method" />
        <ValuationGauge value={chicagoMethod} max={10000000} label="First Chicago Method" />
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
          <ValuationGauge value={average} max={10000000} label="Overall Estimated Value (Average)" />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-3">Calculation</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">VC Method</span>
                <span className="font-medium text-foreground">${vcMethod.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">First Chicago</span>
                <span className="font-medium text-foreground">${chicagoMethod.toLocaleString()}</span>
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

export default SeedEvaluationSummary;

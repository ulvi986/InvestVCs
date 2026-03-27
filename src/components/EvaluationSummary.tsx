import ValuationGauge from "./ValuationGauge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface EvaluationSummaryProps {
  berkus: number;
  scorecard: number;
  riskFactor: number;
}

const colors = ["hsl(217, 91%, 60%)", "hsl(172, 66%, 50%)", "hsl(280, 60%, 55%)", "hsl(45, 93%, 58%)"];

const EvaluationSummary = ({ berkus, scorecard, riskFactor }: EvaluationSummaryProps) => {
  const { t } = useLanguage();

  const average = berkus > 0 || scorecard > 0 || riskFactor > 0
    ? Math.round(([berkus, scorecard, riskFactor].filter(v => v > 0).reduce((a, b) => a + b, 0)) / [berkus, scorecard, riskFactor].filter(v => v > 0).length)
    : 0;

  const chartData = [
    { method: t("eval_summary.berkus"), value: berkus },
    { method: t("eval_summary.scorecard"), value: scorecard },
    { method: t("eval_summary.risk_factor"), value: riskFactor },
    { method: t("eval_summary.average"), value: average },
  ];

  const tips: { icon: typeof Lightbulb; title: string; text: string; type: "info" | "success" | "warning" }[] = [];

  if (average === 0) {
    tips.push({ icon: AlertTriangle, title: t("eval_summary.no_data_title"), text: t("eval_summary.no_data_text"), type: "warning" });
  } else if (average < 1_000_000) {
    tips.push({ icon: AlertTriangle, title: t("eval_summary.low_val"), text: t("eval_summary.low_val_text"), type: "warning" });
  } else if (average < 2_500_000) {
    tips.push({ icon: Lightbulb, title: t("eval_summary.mod_val"), text: t("eval_summary.mod_val_text"), type: "info" });
  } else {
    tips.push({ icon: CheckCircle, title: t("eval_summary.strong_val"), text: t("eval_summary.strong_val_text"), type: "success" });
  }

  if (berkus < scorecard * 0.5 && berkus > 0) {
    tips.push({ icon: AlertTriangle, title: t("eval_summary.berkus_low"), text: t("eval_summary.berkus_low_text"), type: "warning" });
  }
  if (riskFactor < average * 0.7 && riskFactor > 0) {
    tips.push({ icon: AlertTriangle, title: t("eval_summary.risk_concern"), text: t("eval_summary.risk_concern_text"), type: "warning" });
  }
  if (scorecard > berkus && scorecard > riskFactor && scorecard > 0) {
    tips.push({ icon: TrendingUp, title: t("eval_summary.scorecard_advantage"), text: t("eval_summary.scorecard_advantage_text"), type: "success" });
  }
  if (average > 0) {
    tips.push({ icon: Lightbulb, title: t("eval_summary.next_step"), text: average > 2_000_000 ? t("eval_summary.next_step_high") : t("eval_summary.next_step_low"), type: "info" });
  }

  const typeStyles = { info: "border-primary/20 bg-primary/5", success: "border-accent/20 bg-accent/5", warning: "border-destructive/20 bg-destructive/5" };
  const iconStyles = { info: "text-primary", success: "text-accent", warning: "text-destructive" };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <ValuationGauge value={berkus} max={2500000} label={t("eval_summary.berkus")} />
        <ValuationGauge value={scorecard} max={6000000} label={t("eval_summary.scorecard")} />
        <ValuationGauge value={riskFactor} max={5000000} label={t("eval_summary.risk_factor")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t("eval_summary.comparison")}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="method" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString("en-US")}`} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => (<Cell key={i} fill={colors[i]} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <ValuationGauge value={average} max={5000000} label={t("eval_summary.overall_avg")} />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t("eval_summary.calculation")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("eval_summary.berkus")}</span><span className="font-medium text-foreground">${berkus.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("eval_summary.scorecard")}</span><span className="font-medium text-foreground">${scorecard.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("eval_summary.risk_factor")}</span><span className="font-medium text-foreground">${riskFactor.toLocaleString()}</span></div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
                <span className="text-foreground">{t("eval_summary.average")}</span>
                <span className="text-gradient">${average.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-foreground mb-4">💡 {t("eval_summary.advice_title")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {tips.map((tip, i) => (
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

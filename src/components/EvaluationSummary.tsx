import ValuationGauge from "./ValuationGauge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface EvaluationSummaryProps {
  berkus: number;
  scorecard: number;
  riskFactor: number;
}

const colors = ["hsl(228, 63%, 44%)", "hsl(160, 63%, 30%)", "hsl(280, 60%, 55%)", "hsl(228, 63%, 44%)"];

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

  const tipAccent = { info: "var(--accent-ink)", success: "var(--positive)", warning: "var(--negative)" };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <ValuationGauge value={berkus} max={2500000} label={t("eval_summary.berkus")} />
        <ValuationGauge value={scorecard} max={6000000} label={t("eval_summary.scorecard")} />
        <ValuationGauge value={riskFactor} max={5000000} label={t("eval_summary.risk_factor")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--rule)] bg-card p-6">
          <h3 className="font-origin-display text-xl font-medium text-foreground mb-4">{t("eval_summary.comparison")}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 8%, 18%)" />
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
          <div className="rounded-3xl border border-[var(--rule)] bg-card p-6">
            <h3 className="font-origin-display text-xl font-medium text-foreground mb-3">{t("eval_summary.calculation")}</h3>
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
        <h3 className="font-origin-display text-2xl font-light text-foreground mb-5">{t("eval_summary.advice_title")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-4 rounded-2xl border border-[var(--rule)] bg-card p-5" style={{ borderLeft: `2px solid ${tipAccent[tip.type]}` }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${tipAccent[tip.type]}1f` }}>
                <tip.icon className="h-4 w-4" style={{ color: tipAccent[tip.type] }} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">{tip.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed font-light">{tip.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EvaluationSummary;

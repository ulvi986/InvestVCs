import ValuationGauge from "./ValuationGauge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SeedEvaluationSummaryProps {
  vcMethod: number;
  chicagoMethod: number;
}

const colors = ["hsl(217, 91%, 60%)", "hsl(172, 66%, 50%)", "hsl(45, 93%, 58%)"];

const SeedEvaluationSummary = ({ vcMethod, chicagoMethod }: SeedEvaluationSummaryProps) => {
  const { t } = useLanguage();
  const values = [vcMethod, chicagoMethod].filter(v => v > 0);
  const average = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  const chartData = [
    { method: t("seed_summary.vc_method"), value: vcMethod },
    { method: t("seed_summary.chicago_method"), value: chicagoMethod },
    { method: t("eval_summary.average"), value: average },
  ];

  const tips: { icon: typeof Lightbulb; title: string; text: string; type: "info" | "success" | "warning" }[] = [];

  if (average === 0) {
    tips.push({ icon: AlertTriangle, title: t("seed_summary.no_data_title"), text: t("seed_summary.no_data_text"), type: "warning" });
  } else if (average < 500_000) {
    tips.push({ icon: AlertTriangle, title: t("seed_summary.low_val"), text: t("seed_summary.low_val_text"), type: "warning" });
  } else if (average < 3_000_000) {
    tips.push({ icon: Lightbulb, title: t("seed_summary.mod_val"), text: t("seed_summary.mod_val_text"), type: "info" });
  } else {
    tips.push({ icon: CheckCircle, title: t("seed_summary.strong_val"), text: t("seed_summary.strong_val_text"), type: "success" });
  }

  if (vcMethod > 0 && chicagoMethod > 0 && Math.abs(vcMethod - chicagoMethod) > average * 0.5) {
    tips.push({ icon: AlertTriangle, title: t("seed_summary.large_gap"), text: t("seed_summary.large_gap_text"), type: "warning" });
  }
  if (vcMethod > chicagoMethod && vcMethod > 0 && chicagoMethod > 0) {
    tips.push({ icon: TrendingUp, title: t("seed_summary.vc_higher"), text: t("seed_summary.vc_higher_text"), type: "info" });
  } else if (chicagoMethod > vcMethod && vcMethod > 0 && chicagoMethod > 0) {
    tips.push({ icon: TrendingUp, title: t("seed_summary.chicago_higher"), text: t("seed_summary.chicago_higher_text"), type: "success" });
  }
  if (average > 0) {
    tips.push({ icon: Lightbulb, title: t("eval_summary.next_step"), text: average > 2_000_000 ? t("seed_summary.next_step_high") : t("seed_summary.next_step_low"), type: "info" });
  }

  const typeStyles = { info: "border-primary/20 bg-primary/5", success: "border-accent/20 bg-accent/5", warning: "border-destructive/20 bg-destructive/5" };
  const iconStyles = { info: "text-primary", success: "text-accent", warning: "text-destructive" };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <ValuationGauge value={vcMethod} max={10000000} label={t("seed_summary.vc_method")} />
        <ValuationGauge value={chicagoMethod} max={10000000} label={t("seed_summary.chicago_method")} />
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
          <ValuationGauge value={average} max={10000000} label={t("eval_summary.overall_avg")} />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t("eval_summary.calculation")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("seed_summary.vc_method")}</span><span className="font-medium text-foreground">${vcMethod.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("seed_summary.chicago_method")}</span><span className="font-medium text-foreground">${chicagoMethod.toLocaleString()}</span></div>
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

export default SeedEvaluationSummary;

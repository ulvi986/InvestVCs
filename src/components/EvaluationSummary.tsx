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
      title: "Məlumat daxil edilməyib",
      text: "Nəticə görmək üçün əvvəlcə hər üç metodu doldurun: Berkus, Scorecard və Risk Factor.",
      type: "warning",
    });
    return tips;
  }

  // General valuation range advice
  if (average < 1_000_000) {
    tips.push({
      icon: AlertTriangle,
      title: "Aşağı qiymətləndirmə",
      text: "Startapınızın ümumi dəyəri nisbətən aşağıdır. Komanda gücünüzü, bazarınızı və məhsulunuzu inkişaf etdirməyə fokuslanın.",
      type: "warning",
    });
  } else if (average < 2_500_000) {
    tips.push({
      icon: Lightbulb,
      title: "Orta səviyyədə qiymətləndirmə",
      text: "Startapınız yaxşı başlanğıc nöqtəsindədir. Strateji tərəfdaşlıqlar və satış kanallarını gücləndirsəniz dəyər artacaq.",
      type: "info",
    });
  } else {
    tips.push({
      icon: CheckCircle,
      title: "Güclü qiymətləndirmə",
      text: "Startapınız yüksək potensiala malikdir. İnvestorlarla danışıqlara hazır ola bilərsiniz.",
      type: "success",
    });
  }

  // Method-specific advice
  if (berkus < scorecard * 0.5 && berkus > 0) {
    tips.push({
      icon: AlertTriangle,
      title: "Berkus dəyəri aşağıdır",
      text: "Erkən mərhələ komponentlərini (prototip, komanda, strateji tərəfdaşlıqlar) gücləndirməyiniz tövsiyə olunur.",
      type: "warning",
    });
  }

  if (riskFactor < average * 0.7 && riskFactor > 0) {
    tips.push({
      icon: AlertTriangle,
      title: "Risk faktorları narahatedicidir",
      text: "Bir neçə risk kateqoriyasında yüksək risk göstəricisiniz var. Bu riskləri azaltmaq üçün plan hazırlayın.",
      type: "warning",
    });
  }

  if (scorecard > berkus && scorecard > riskFactor && scorecard > 0) {
    tips.push({
      icon: TrendingUp,
      title: "Scorecard üstünlüyü",
      text: "Regional müqayisədə güclü görünürsünüz. Bu üstünlüyünüzü investorlara təqdim edərkən vurğulayın.",
      type: "success",
    });
  }

  // Always give an action tip
  tips.push({
    icon: Lightbulb,
    title: "Növbəti addım",
    text: average > 2_000_000
      ? "Pitch deck hazırlayın və investor görüşlərinə başlayın. Bu qiymətləndirməni əsas götürərək müzakirə aparın."
      : "Hazırlıq mərhələsinə keçin, komandanızı gücləndirin və bazarınızı daha yaxşı tanıyın.",
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
    { method: "Berkus", value: berkus },
    { method: "Scorecard", value: scorecard },
    { method: "Risk Factor", value: riskFactor },
    { method: "Average", value: average },
    { method: "Ortalama", value: average },
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

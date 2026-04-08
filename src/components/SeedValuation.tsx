import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import ValuationGauge from "./ValuationGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { ChicagoAnswers } from "@/context/StartupContext";

interface SeedValuationProps {
  answers: ChicagoAnswers;
  onAnswersChange: (answers: ChicagoAnswers) => void;
  onValuationChange?: (value: number) => void;
}

const SeedValuation = ({ answers, onAnswersChange, onValuationChange }: SeedValuationProps) => {
  const { t } = useLanguage();
  const { revenue, exitMultiple, customMultiple, isOther, yearsToExit, discountRates, probabilities } = answers;

  const update = (patch: Partial<ChicagoAnswers>) => onAnswersChange({ ...answers, ...patch });

  const exitValue = revenue * exitMultiple;
  const pvWorst = exitValue / Math.pow(1 + discountRates.worst / 100, yearsToExit);
  const pvBase = exitValue / Math.pow(1 + discountRates.base / 100, yearsToExit);
  const pvBest = exitValue / Math.pow(1 + discountRates.best / 100, yearsToExit);

  const finalValuation = Math.round(
    (pvWorst * probabilities.worst / 100) + (pvBase * probabilities.base / 100) + (pvBest * probabilities.best / 100)
  );

  useEffect(() => {
    onValuationChange?.(finalValuation);
  }, [finalValuation, onValuationChange]);

  const handleProbabilityChange = (scenario: "worst" | "base" | "best", value: number) => {
    const updated = { ...probabilities, [scenario]: value };
    const total = updated.worst + updated.base + updated.best;
    if (total > 100) {
      const others = (Object.keys(updated) as Array<"worst" | "base" | "best">).filter(k => k !== scenario);
      const excess = total - 100;
      const otherTotal = others.reduce((sum, k) => sum + updated[k], 0);
      if (otherTotal > 0) others.forEach(k => { updated[k] = Math.max(0, Math.round(updated[k] - (updated[k] / otherTotal) * excess)); });
    }
    update({ probabilities: updated });
  };

  const probTotal = probabilities.worst + probabilities.base + probabilities.best;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("seed.projected_revenue")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="revenue">{t("seed.revenue")} ($)</Label>
              <Input id="revenue" type="number" min={0} value={revenue || ""} onChange={e => update({ revenue: Number(e.target.value) || 0 })} placeholder="e.g. 1,000,000" />
              <p className="text-xs text-muted-foreground">{t("seed.revenue_desc")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("seed.exit_multiple")}</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup
              value={isOther ? "other" : String(exitMultiple)}
              onValueChange={v => { if (v === "other") { update({ isOther: true, exitMultiple: customMultiple }); } else { update({ isOther: false, exitMultiple: Number(v) }); } }}
              className="grid grid-cols-2 gap-3"
            >
              {[5, 8, 10, 15].map(m => (
                <div key={m} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(m)} id={`mult-${m}`} />
                  <Label htmlFor={`mult-${m}`} className="cursor-pointer font-medium">{m}x</Label>
                </div>
              ))}
              <div className="flex items-center space-x-2 col-span-2">
                <RadioGroupItem value="other" id="mult-other" />
                <Label htmlFor="mult-other" className="cursor-pointer font-medium">{t("seed.other")}</Label>
                {isOther && (
                  <div className="flex items-center gap-1 ml-2">
                    <Input type="number" min={1} value={customMultiple} onChange={e => { const val = Number(e.target.value) || 1; update({ customMultiple: val, exitMultiple: val }); }} className="w-20 h-8" />
                    <span className="text-sm text-muted-foreground">x</span>
                  </div>
                )}
              </div>
            </RadioGroup>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("seed.exit_value_formula")}: <span className="font-semibold text-foreground">${exitValue.toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("seed.years_to_exit")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Slider value={[yearsToExit]} onValueChange={v => update({ yearsToExit: v[0] })} min={1} max={10} step={1} />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">1 {t("seed.year")}</span>
              <span className="font-semibold text-foreground">{yearsToExit} {t("seed.years")}</span>
              <span className="text-muted-foreground">10 {t("seed.years")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {t("seed.discount_rates")}
            <span className="text-xs font-normal text-muted-foreground">— {t("seed.discount_rates_desc")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(["worst", "base", "best"] as const).map(scenario => (
              <div key={scenario} className="space-y-2">
                <Label>{t(`seed.${scenario}_case`)}</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={100} value={discountRates[scenario]} onChange={e => update({ discountRates: { ...discountRates, [scenario]: Number(e.target.value) || 1 } })} className="w-20" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {t("seed.scenario_probabilities")}
            {probTotal !== 100 && (
              <span className="text-xs font-normal text-destructive">
                ({t("seed.total")}: {probTotal}% — {t("seed.must_equal_100")})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(["worst", "base", "best"] as const).map(scenario => (
              <div key={scenario} className="space-y-2">
                <Label>{t(`seed.${scenario}_case`)}</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} value={probabilities[scenario]} onChange={e => handleProbabilityChange(scenario, Number(e.target.value) || 0)} className="w-20" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">{t("seed.how_it_works")}:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li><strong>{t("seed.exit_value_label")}</strong> = Revenue × Multiple = ${exitValue.toLocaleString()}</li>
                <li><strong>{t("seed.present_value")}</strong> = Exit Value / (1 + r)^n</li>
                <li><strong>{t("seed.final_valuation")}</strong> = Σ (PV × Probability)</li>
              </ol>
              <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">PV {t("seed.worst_case")}</p>
                  <p className="font-semibold text-foreground">${Math.round(pvWorst).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">PV {t("seed.base_case")}</p>
                  <p className="font-semibold text-foreground">${Math.round(pvBase).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">PV {t("seed.best_case")}</p>
                  <p className="font-semibold text-foreground">${Math.round(pvBest).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ValuationGauge value={finalValuation} max={10000000} label={t("seed.seed_valuation_label")} />
    </div>
  );
};

export default SeedValuation;

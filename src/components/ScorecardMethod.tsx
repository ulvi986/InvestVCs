import { useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";

const factorKeys = ["team", "market", "product", "competitive", "sales", "financing", "other"];
const weights = [0.30, 0.25, 0.15, 0.10, 0.10, 0.05, 0.05];
const weightLabels = ["30%", "25%", "15%", "10%", "10%", "5%", "5%"];
const scoreValues = [60, 80, 100, 120, 150];
const scoreKeys = ["very_weak", "weak", "average", "strong", "very_strong"];
const scoreColors = ["text-destructive", "text-orange-500", "text-muted-foreground", "text-emerald-500", "text-primary"];

interface ScorecardMethodProps {
  scores: (number | null)[];
  medianValuation: number;
  onScoresChange: (scores: (number | null)[]) => void;
  onMedianChange: (median: number) => void;
  onValuationChange?: (value: number) => void;
}

const ScorecardMethod = ({ scores, medianValuation, onScoresChange, onMedianChange, onValuationChange }: ScorecardMethodProps) => {
  const { t } = useLanguage();

  const median = medianValuation || 0;

  const weightedScore = factorKeys.reduce((sum, _, i) => {
    const score = scores[i] !== null ? scores[i]! / 100 : 0;
    return sum + score * weights[i];
  }, 0);

  const finalValuation = Math.round(median * weightedScore);

  useEffect(() => {
    onValuationChange?.(finalValuation);
  }, [finalValuation, onValuationChange]);

  const updateScore = (idx: number, value: string) => {
    const next = [...scores];
    next[idx] = parseInt(value);
    onScoresChange(next);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-1">
          {t("scorecard.base_val")}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("scorecard.base_val_desc")}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-foreground">$</span>
          <Input
            type="number"
            placeholder="e.g. 3000000"
            value={medianValuation || ""}
            onChange={(e) => onMedianChange(parseFloat(e.target.value) || 0)}
            className="max-w-xs text-lg"
          />
          <span className="text-sm text-muted-foreground">USD</span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h4 className="text-sm font-semibold text-foreground mb-3">{t("scorecard.factor_weights")}</h4>
          <div className="grid grid-cols-2 gap-2">
            {factorKeys.map((key, i) => (
              <div key={key} className="flex justify-between text-sm py-1 px-2 rounded bg-muted/50">
                <span className="text-muted-foreground">{t(`scorecard.${key}`)}</span>
                <span className="font-medium text-foreground">{weightLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {factorKeys.map((key, i) => (
          <div key={key} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-foreground">
                {i + 1}. {t(`scorecard.${key}`)}
              </h3>
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {t("scorecard.weight")}: {weightLabels[i]}
              </span>
            </div>
            <p className="text-sm text-foreground/80 mb-4">{t(`scorecard.${key}_q`)}</p>
            <RadioGroup
              value={scores[i] !== null ? String(scores[i]) : undefined}
              onValueChange={(v) => updateScore(i, v)}
              className="space-y-2"
            >
              {scoreValues.map((val, si) => (
                <div
                  key={val}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                    scores[i] === val
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                  onClick={() => updateScore(i, String(val))}
                >
                  <RadioGroupItem value={String(val)} id={`${key}-${val}`} />
                  <Label htmlFor={`${key}-${val}`} className="text-sm cursor-pointer flex-1">
                    <span className={`font-medium ${scoreColors[si]}`}>{t(`scorecard.${scoreKeys[si]}`)}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScorecardMethod;

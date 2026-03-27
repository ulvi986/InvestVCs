import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";

const ADJUSTMENT_PER_POINT = 250000;

const riskKeys = [
  "management", "stage", "legislation", "supply", "sales_marketing",
  "funding", "competition", "technology", "international", "reputation",
  "exit", "political",
];

const scoreValues = [-2, -1, 0, 1, 2];
const scoreKeys = ["very_high", "high", "average", "low", "very_low"];
const scoreColors = ["text-destructive", "text-orange-500", "text-muted-foreground", "text-emerald-500", "text-primary"];

interface RiskFactorMethodProps {
  onValuationChange?: (value: number) => void;
}

const RiskFactorMethod = ({ onValuationChange }: RiskFactorMethodProps) => {
  const { t } = useLanguage();
  const baseValuation = 250000;
  const [scores, setScores] = useState<(number | null)[]>(Array(riskKeys.length).fill(null));

  const totalAdjustment = scores.reduce((sum, s) => sum + (s !== null ? s * ADJUSTMENT_PER_POINT : 0), 0);
  const valuation = Math.max(0, baseValuation + totalAdjustment);

  useEffect(() => {
    onValuationChange?.(valuation);
  }, [valuation, onValuationChange]);

  const updateScore = (idx: number, value: string) => {
    setScores((prev) => {
      const next = [...prev];
      next[idx] = parseInt(value);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-1">{t("risk.base_val")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("risk.base_val_desc")}
        </p>
      </div>

      <div className="space-y-6">
        {riskKeys.map((key, i) => {
          const adjustment = scores[i] !== null ? scores[i]! * ADJUSTMENT_PER_POINT : 0;
          return (
            <div key={key} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-foreground">
                  {i + 1}. {t(`risk.${key}`)}
                </h3>
                {scores[i] !== null && (
                  <span className={`text-sm font-semibold ${adjustment > 0 ? "text-emerald-500" : adjustment < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {adjustment >= 0 ? "+" : ""}${adjustment.toLocaleString("en-US")}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/80 mb-4">{t(`risk.${key}_q`)}</p>
              <RadioGroup
                value={scores[i] !== null ? String(scores[i]) : undefined}
                onValueChange={(v) => updateScore(i, v)}
                className="space-y-2"
              >
                {scoreValues.map((val, si) => (
                  <div
                    key={val}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors cursor-pointer ${
                      scores[i] === val
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => updateScore(i, String(val))}
                  >
                    <RadioGroupItem value={String(val)} id={`${key}-${val}`} />
                    <Label htmlFor={`${key}-${val}`} className="text-sm cursor-pointer flex-1">
                      <span className={`font-medium ${scoreColors[si]}`}>{t(`risk.${scoreKeys[si]}`)}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskFactorMethod;

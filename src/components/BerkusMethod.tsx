import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";

const scoreToValue: Record<number, number> = {
  0: 0, 1: 70000, 2: 150000, 3: 250000, 4: 400000, 5: 500000,
};

const componentKeys = ["sound_idea", "prototype", "team", "strategic", "traction"];

interface BerkusMethodProps {
  onValuationChange?: (value: number) => void;
}

const BerkusMethod = ({ onValuationChange }: BerkusMethodProps) => {
  const { t } = useLanguage();
  const [scores, setScores] = useState<(number | null)[]>([null, null, null, null, null]);

  const values = scores.map((s) => (s !== null ? scoreToValue[s] : 0));
  const total = values.reduce((a, b) => a + b, 0);

  useEffect(() => {
    onValuationChange?.(total);
  }, [total, onValuationChange]);

  const updateScore = (idx: number, score: string) => {
    setScores((prev) => {
      const next = [...prev];
      next[idx] = parseInt(score);
      return next;
    });
  };

  const components = componentKeys.map((key) => ({
    name: t(`berkus.${key}`),
    subtitle: t(`berkus.${key}_sub`),
    question: t(`berkus.${key}_q`),
    options: [0, 1, 2, 3, 4, 5].map((s) => ({
      score: s,
      label: t(`berkus.${key}_${s}`),
    })),
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {components.map((comp, i) => (
          <div key={componentKeys[i]} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-base font-semibold text-foreground">
              {i + 1}. {comp.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{comp.subtitle}</p>
            <p className="text-sm text-foreground/80 mb-4">{comp.question}</p>
            <RadioGroup
              value={scores[i] !== null ? String(scores[i]) : undefined}
              onValueChange={(v) => updateScore(i, v)}
              className="space-y-2"
            >
              {comp.options.map((opt) => (
                <div
                  key={opt.score}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                    scores[i] === opt.score
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                  onClick={() => updateScore(i, String(opt.score))}
                >
                  <RadioGroupItem value={String(opt.score)} id={`${componentKeys[i]}-${opt.score}`} className="mt-0.5" />
                  <Label htmlFor={`${componentKeys[i]}-${opt.score}`} className="text-sm cursor-pointer flex-1 leading-relaxed">
                    <span className="text-muted-foreground">{opt.label}</span>
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

export default BerkusMethod;

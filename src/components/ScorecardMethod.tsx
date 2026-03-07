import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ValuationGauge from "./ValuationGauge";

const scoreOptions = [
  { value: 60, label: "Very Weak", color: "text-destructive" },
  { value: 80, label: "Weak", color: "text-orange-500" },
  { value: 100, label: "Average", color: "text-muted-foreground" },
  { value: 120, label: "Strong", color: "text-emerald-500" },
  { value: 150, label: "Very Strong", color: "text-primary" },
];

const factors = [
  {
    name: "Team",
    weight: 0.30,
    weightLabel: "30%",
    question: "How strong is the team compared to the average startup in your target market?",
  },
  {
    name: "Market Opportunity",
    weight: 0.25,
    weightLabel: "25%",
    question: "How strong is the target market size and growth potential for startups like yours?",
  },
  {
    name: "Product / Technology",
    weight: 0.15,
    weightLabel: "15%",
    question: "How innovative and technically strong is your startup compared to the average startup in your target market?",
  },
  {
    name: "Competitive Environment",
    weight: 0.10,
    weightLabel: "10%",
    question: "How favorable is the competitive environment for your startup in your target market?",
  },
  {
    name: "Marketing / Sales",
    weight: 0.10,
    weightLabel: "10%",
    question: "How effective is your startup's sales and marketing strategy compared to other startups in your target market?",
  },
  {
    name: "Need for Additional Financing",
    weight: 0.05,
    weightLabel: "5%",
    subtitle: "Capital Dependency Risk",
    question: "How urgent and necessary is additional funding for your startup compared to other startups in your target market?",
  },
  {
    name: "Other Factors",
    weight: 0.05,
    weightLabel: "5%",
    subtitle: "Legal risk, IP, Traction, Strategic advantage",
    question: "How does your startup compare to others in terms of legal protection, IP, traction, and strategic advantages?",
  },
];

interface ScorecardMethodProps {
  onValuationChange?: (value: number) => void;
}

const ScorecardMethod = ({ onValuationChange }: ScorecardMethodProps) => {
  const [scores, setScores] = useState<(number | null)[]>(Array(factors.length).fill(null));
  const [medianValuation, setMedianValuation] = useState<string>("");

  const median = parseFloat(medianValuation) || 0;

  const weightedScore = factors.reduce((sum, factor, i) => {
    const score = scores[i] !== null ? scores[i]! / 100 : 0;
    return sum + score * factor.weight;
  }, 0);

  const finalValuation = Math.round(median * weightedScore);

  useEffect(() => {
    onValuationChange?.(finalValuation);
  }, [finalValuation, onValuationChange]);

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
        <h3 className="text-base font-semibold text-foreground mb-1">
          Average Market Valuation
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          What is the average market valuation of startups in your target market?
        </p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-foreground">$</span>
          <Input
            type="number"
            placeholder="e.g. 3000000"
            value={medianValuation}
            onChange={(e) => setMedianValuation(e.target.value)}
            className="max-w-xs text-lg"
          />
          <span className="text-sm text-muted-foreground">USD</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Factor Weights</h4>
            <div className="grid grid-cols-2 gap-2">
              {factors.map((f) => (
                <div key={f.name} className="flex justify-between text-sm py-1 px-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">{f.name}</span>
                  <span className="font-medium text-foreground">{f.weightLabel}</span>
                </div>
              ))}
            </div>
          </div>

          {factors.map((factor, i) => (
            <div key={factor.name} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-foreground">
                  {i + 1}. {factor.name}
                </h3>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Weight: {factor.weightLabel}
                </span>
              </div>
              {factor.subtitle && (
                <p className="text-xs text-muted-foreground mb-2">{factor.subtitle}</p>
              )}
              <p className="text-sm text-foreground/80 mb-4">{factor.question}</p>
              <RadioGroup
                value={scores[i] !== null ? String(scores[i]) : undefined}
                onValueChange={(v) => updateScore(i, v)}
                className="space-y-2"
              >
                {scoreOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                      scores[i] === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => updateScore(i, String(opt.value))}
                  >
                    <RadioGroupItem
                      value={String(opt.value)}
                      id={`${factor.name}-${opt.value}`}
                    />
                    <Label
                      htmlFor={`${factor.name}-${opt.value}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      <span className={`font-medium ${opt.color}`}>{opt.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <ValuationGauge value={finalValuation} max={median * 1.5 || 5000000} />

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Calculation Breakdown</h4>
            <div className="space-y-2">
              {factors.map((factor, i) => {
                const score = scores[i];
                const contribution = score !== null ? ((score / 100) * factor.weight * 100).toFixed(1) : "—";
                return (
                  <div key={factor.name} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{factor.name}</span>
                    <span className="font-medium text-foreground whitespace-nowrap">
                      {score !== null ? `${score}% × ${factor.weightLabel} = ${contribution}%` : "—"}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Weighted Factor</span>
                  <span className="font-semibold text-foreground">
                    {(weightedScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Median Valuation</span>
                  <span className="font-medium text-foreground">
                    ${median.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-border">
                  <span className="text-foreground">Final Valuation</span>
                  <span className="text-gradient">
                    ${finalValuation.toLocaleString("en-US")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardMethod;

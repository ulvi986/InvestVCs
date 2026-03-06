import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import ValuationGauge from "./ValuationGauge";

const factors = [
  { name: "Team", weight: 0.30 },
  { name: "Market Size", weight: 0.16 },
  { name: "Product / Technology", weight: 0.18 },
  { name: "Competition", weight: 0.075 },
  { name: "Marketing / Sales", weight: 0.07 },
  { name: "Other Factors", weight: 0.06 },
];

const ScorecardMethod = () => {
  const [median, setMedian] = useState(3000000);
  const [scores, setScores] = useState<number[]>(factors.map(() => 100));

  const weightedScore = factors.reduce((sum, f, i) => sum + (scores[i] / 100) * f.weight, 0);
  const valuation = Math.round(median * weightedScore);

  const updateScore = (idx: number, val: number[]) => {
    setScores((prev) => {
      const next = [...prev];
      next[idx] = val[0];
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <label className="text-sm font-medium text-foreground">
          Median Pre-Money Valuation of Comparable Startups
        </label>
        <div className="mt-2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            type="number"
            value={median}
            onChange={(e) => setMedian(Number(e.target.value) || 0)}
            className="pl-7"
            placeholder="3,000,000"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {factors.map((f, i) => (
            <div key={f.name} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {f.name} <span className="text-muted-foreground">({(f.weight * 100).toFixed(1)}%)</span>
                </span>
                <span className="text-sm font-semibold text-primary">{scores[i]}%</span>
              </div>
              <Slider
                value={[scores[i]]}
                onValueChange={(v) => updateScore(i, v)}
                max={200}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>0%</span>
                <span>200%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <ValuationGauge value={valuation} max={median * 2} />
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Calculation</h4>
            <div className="space-y-2 text-sm">
              {factors.map((f, i) => (
                <div key={f.name} className="flex justify-between">
                  <span className="text-muted-foreground">{f.name}</span>
                  <span className="font-medium text-foreground">
                    {scores[i]}% × {(f.weight * 100).toFixed(1)}% = {((scores[i] / 100) * f.weight * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weighted Score</span>
                  <span className="font-semibold text-foreground">{(weightedScore * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Final Valuation</span>
                  <span className="font-bold text-gradient">${valuation.toLocaleString("en-US")}</span>
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

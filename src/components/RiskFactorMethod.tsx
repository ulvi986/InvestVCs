import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ValuationGauge from "./ValuationGauge";

const risks = [
  "Management Risk",
  "Stage of Business Risk",
  "Legislation / Political Risk",
  "Supply Chain / Manufacturing Risk",
  "Sales and Marketing Risk",
  "Funding / Capital Raising Risk",
  "Competition Risk",
  "Technology Risk",
  "Litigation Risk",
  "International Risk",
  "Reputation Risk",
  "Potential Exit Risk",
];

const scoreOptions = [
  { value: "2", label: "+2 (Very Low Risk)", adjustment: 500000 },
  { value: "1", label: "+1 (Low Risk)", adjustment: 250000 },
  { value: "0", label: "0 (Average)", adjustment: 0 },
  { value: "-1", label: "-1 (High Risk)", adjustment: -250000 },
  { value: "-2", label: "-2 (Very High Risk)", adjustment: -500000 },
];

interface RiskFactorMethodProps {
  onValuationChange?: (value: number) => void;
}

const RiskFactorMethod = ({ onValuationChange }: RiskFactorMethodProps) => {
  const [base, setBase] = useState(2000000);
  const [scores, setScores] = useState<number[]>(risks.map(() => 0));

  const totalAdjustment = scores.reduce((sum, s) => {
    const opt = scoreOptions.find((o) => Number(o.value) === s);
    return sum + (opt?.adjustment || 0);
  }, 0);

  const valuation = Math.max(0, base + totalAdjustment);

  useEffect(() => {
    onValuationChange?.(valuation);
  }, [valuation, onValuationChange]);

  const updateScore = (idx: number, val: string) => {
    setScores((prev) => {
      const next = [...prev];
      next[idx] = Number(val);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <label className="text-sm font-medium text-foreground">Base Valuation</label>
        <div className="mt-2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            type="number"
            value={base}
            onChange={(e) => setBase(Number(e.target.value) || 0)}
            className="pl-7"
            placeholder="2,000,000"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {risks.map((risk, i) => {
            const adj = scoreOptions.find((o) => Number(o.value) === scores[i])?.adjustment || 0;
            return (
              <div key={risk} className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{risk}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${adj > 0 ? "text-accent" : adj < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {adj >= 0 ? "+" : ""}${adj.toLocaleString("en-US")}
                  </p>
                </div>
                <Select value={String(scores[i])} onValueChange={(v) => updateScore(i, v)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scoreOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
        <div className="space-y-6">
          <ValuationGauge value={valuation} max={base + 6000000} />
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Valuation</span>
                <span className="font-medium text-foreground">${base.toLocaleString("en-US")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Adjustment</span>
                <span className={`font-medium ${totalAdjustment >= 0 ? "text-accent" : "text-destructive"}`}>
                  {totalAdjustment >= 0 ? "+" : ""}${totalAdjustment.toLocaleString("en-US")}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
                <span className="text-foreground">Final Valuation</span>
                <span className="text-gradient">${valuation.toLocaleString("en-US")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskFactorMethod;

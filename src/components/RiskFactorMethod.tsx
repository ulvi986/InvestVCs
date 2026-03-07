import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import ValuationGauge from "./ValuationGauge";

const ADJUSTMENT_PER_POINT = 250000;

const scoreOptions = [
  { value: -2, label: "Very High Risk", color: "text-destructive" },
  { value: -1, label: "High Risk", color: "text-orange-500" },
  { value: 0, label: "Average", color: "text-muted-foreground" },
  { value: 1, label: "Low Risk", color: "text-emerald-500" },
  { value: 2, label: "Very Low Risk", color: "text-primary" },
];

const risks = [
  {
    name: "Management Risk",
    question: "The strength and experience of the startup's team",
    options: [
      { score: -2, label: "Team is inexperienced and unbalanced" },
      { score: -1, label: "Experience is weak" },
      { score: 0, label: "Average level" },
      { score: 1, label: "Experienced and balanced team" },
      { score: 2, label: "Proven successful team" },
    ],
  },
  {
    name: "Stage of Business Risk",
    question: "What stage is the startup at?",
    options: [
      { score: -2, label: "Idea" },
      { score: -1, label: "Prototype" },
      { score: 0, label: "MVP" },
      { score: 1, label: "Traction (customers exist)" },
      { score: 2, label: "Revenue (generating income)" },
    ],
  },
  {
    name: "Legislation / Political Risk",
    question: "Regulatory and government policy risk for the startup's operating sector",
    options: [
      { score: -2, label: "Legal uncertainty exists" },
      { score: -1, label: "Certain risks are present" },
      { score: 0, label: "Standard legal risk" },
      { score: 1, label: "Legal framework is strong" },
      { score: 2, label: "Patents/IP are protected and risk is minimal" },
    ],
  },
  {
    name: "Supply Chain / Technology Risk",
    question: "How reliable and scalable is the technology used by the startup?",
    options: [
      { score: -2, label: "Technology is unproven" },
      { score: -1, label: "Unstable" },
      { score: 0, label: "Medium technical risk" },
      { score: 1, label: "Stable product" },
      { score: 2, label: "Measurable and scalable technology" },
    ],
  },
  {
    name: "Sales & Marketing Risk",
    question: "How developed and reliable is the startup's sales and marketing strategy?",
    options: [
      { score: -2, label: "No sales strategy" },
      { score: -1, label: "Unclear GTM plan" },
      { score: 0, label: "Standard plan" },
      { score: 1, label: "Structured GTM" },
      { score: 2, label: "Proven sales channel" },
    ],
  },
  {
    name: "Funding / Capital Raising Risk",
    question: "How secure and accessible is funding for the startup?",
    options: [
      { score: -2, label: "Difficult to raise capital" },
      { score: -1, label: "Risky financial situation" },
      { score: 0, label: "Normal" },
      { score: 1, label: "Strong investor interest" },
      { score: 2, label: "Easy access to capital" },
    ],
  },
  {
    name: "Competition Risk",
    question: "How favorable is the competitive environment for the startup?",
    options: [
      { score: -2, label: "Very strong competitors" },
      { score: -1, label: "Strong competition" },
      { score: 0, label: "Moderate competition" },
      { score: 1, label: "Competitive advantage exists" },
      { score: 2, label: "Clear and strong differentiation" },
    ],
  },
  {
    name: "Technology Obsolescence Risk",
    question: "How resilient is the startup's technology against becoming obsolete?",
    options: [
      { score: -2, label: "Technology may become outdated quickly" },
      { score: -1, label: "Could have a short lifespan" },
      { score: 0, label: "Normal risk" },
      { score: 1, label: "Long-lasting technology" },
      { score: 2, label: "Deep technological barrier" },
    ],
  },
  {
    name: "International Risk",
    question: "How feasible is international expansion for the startup?",
    options: [
      { score: -2, label: "Global expansion is difficult" },
      { score: -1, label: "Dependent on local market" },
      { score: 0, label: "Moderate" },
      { score: 1, label: "Regional expansion possible" },
      { score: 2, label: "Suitable for a global model" },
    ],
  },
  {
    name: "Reputation Risk",
    question: "How strong and reliable is the startup's reputation and brand image?",
    options: [
      { score: -2, label: "Trust issues exist" },
      { score: -1, label: "Weak brand" },
      { score: 0, label: "Normal" },
      { score: 1, label: "Strong reputation" },
      { score: 2, label: "Strong brand image" },
    ],
  },
  {
    name: "Exit Risk",
    question: "How clear and achievable is the startup's exit strategy?",
    options: [
      { score: -2, label: "No exit strategy" },
      { score: -1, label: "Unclear" },
      { score: 0, label: "Moderate" },
      { score: 1, label: "Clear exit plan" },
      { score: 2, label: "Real exit potential" },
    ],
  },
  {
    name: "Political / Macro Risk",
    question: "How stable and favorable is the political and macroeconomic environment for the startup?",
    options: [
      { score: -2, label: "High political risk" },
      { score: -1, label: "Macro risks exist" },
      { score: 0, label: "Normal" },
      { score: 1, label: "Stable environment" },
      { score: 2, label: "Strong economic environment" },
    ],
  },
];

interface RiskFactorMethodProps {
  onValuationChange?: (value: number) => void;
}

const RiskFactorMethod = ({ onValuationChange }: RiskFactorMethodProps) => {
  const baseValuation = 250000;
  const [scores, setScores] = useState<(number | null)[]>(Array(risks.length).fill(null));

  const base = baseValuation;
  const totalAdjustment = scores.reduce((sum, s) => sum + (s !== null ? s * ADJUSTMENT_PER_POINT : 0), 0);
  const valuation = Math.max(0, base + totalAdjustment);

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
        <h3 className="text-base font-semibold text-foreground mb-1">Base Valuation</h3>
        <p className="text-sm text-muted-foreground">
          Fixed at <span className="font-semibold text-foreground">$250,000</span> USD. Each risk score point adjusts the valuation by $250,000.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {risks.map((risk, i) => {
            const adjustment = scores[i] !== null ? scores[i]! * ADJUSTMENT_PER_POINT : 0;
            return (
              <div key={risk.name} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {i + 1}. {risk.name}
                  </h3>
                  {scores[i] !== null && (
                    <span className={`text-sm font-semibold ${adjustment > 0 ? "text-emerald-500" : adjustment < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {adjustment >= 0 ? "+" : ""}${adjustment.toLocaleString("en-US")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/80 mb-4">{risk.question}</p>
                <RadioGroup
                  value={scores[i] !== null ? String(scores[i]) : undefined}
                  onValueChange={(v) => updateScore(i, v)}
                  className="space-y-2"
                >
                  {risk.options.map((opt) => {
                    const optColor = scoreOptions.find((s) => s.value === opt.score)?.color || "";
                    return (
                      <div
                        key={opt.score}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors cursor-pointer ${
                          scores[i] === opt.score
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                        onClick={() => updateScore(i, String(opt.score))}
                      >
                        <RadioGroupItem
                          value={String(opt.score)}
                          id={`${risk.name}-${opt.score}`}
                        />
                        <Label
                          htmlFor={`${risk.name}-${opt.score}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <span className={`font-medium ${optColor}`}>
                            {opt.score >= 0 ? "+" : ""}{opt.score}
                          </span>
                          <span className="text-muted-foreground ml-1.5">— {opt.label}</span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            );
          })}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <ValuationGauge value={valuation} max={(base || 2000000) + 6000000} />

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Risk Breakdown</h4>
            <div className="space-y-2">
              {risks.map((risk, i) => {
                const score = scores[i];
                const adj = score !== null ? score * ADJUSTMENT_PER_POINT : null;
                return (
                  <div key={risk.name} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{risk.name}</span>
                    <span className={`font-medium whitespace-nowrap ${
                      adj !== null ? (adj > 0 ? "text-emerald-500" : adj < 0 ? "text-destructive" : "text-muted-foreground") : "text-muted-foreground"
                    }`}>
                      {adj !== null ? `${adj >= 0 ? "+" : ""}$${adj.toLocaleString("en-US")}` : "—"}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Valuation</span>
                  <span className="font-medium text-foreground">${base.toLocaleString("en-US")}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Total Adjustment</span>
                  <span className={`font-semibold ${totalAdjustment >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {totalAdjustment >= 0 ? "+" : ""}${totalAdjustment.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-border">
                  <span className="text-foreground">Final Valuation</span>
                  <span className="text-gradient">${valuation.toLocaleString("en-US")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskFactorMethod;

import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const scoreToValue: Record<number, number> = {
  0: 0,
  1: 70000,
  2: 150000,
  3: 250000,
  4: 400000,
  5: 500000,
};

const components = [
  {
    name: "Sound Idea",
    subtitle: "Problem & Market Validation",
    question: "How real is the problem your startup solves, and is there a genuine market need?",
    options: [
      { score: 0, label: "Does not solve any real problem; market need has not been validated" },
      { score: 1, label: "The problem is very weak or unclear; no market research conducted" },
      { score: 2, label: "The problem has been identified, but market validation is weak" },
      { score: 3, label: "There is a real problem; preliminary market research has been conducted" },
      { score: 4, label: "Strong problem validation; customer interviews have been conducted" },
      { score: 5, label: "The problem is highly validated; there is a clear and strong market need" },
    ],
  },
  {
    name: "Prototype",
    subtitle: "Product / Technology",
    question: "What stage of development is the product currently at?",
    options: [
      { score: 0, label: "No MVP or prototype exists" },
      { score: 1, label: "Only an idea or concept description exists" },
      { score: 2, label: "Design, wireframe, or mockup is available" },
      { score: 3, label: "A working basic MVP exists" },
      { score: 4, label: "A beta version with real users exists" },
      { score: 5, label: "A stable and actively used product exists" },
    ],
  },
  {
    name: "Quality Management Team",
    subtitle: "Management & Execution Capability",
    question: "Does the team have the experience required to successfully execute the startup?",
    options: [
      { score: 0, label: "Solo founder with no relevant experience" },
      { score: 1, label: "Weak and unbalanced team" },
      { score: 2, label: "Team has some domain knowledge" },
      { score: 3, label: "Balanced team (technical + business)" },
      { score: 4, label: "Experienced team with strong domain expertise" },
      { score: 5, label: "Strong and proven team (previous successes or exits)" },
    ],
  },
  {
    name: "Strategic Relationships",
    subtitle: "Go-to-Market Risk",
    question: "What is the startup's level of market access and strategic partnerships?",
    options: [
      { score: 0, label: "No partners or connections" },
      { score: 1, label: "Initial contacts and discussions exist" },
      { score: 2, label: "Weak collaboration with potential partners" },
      { score: 3, label: "A pilot customer or preliminary agreement exists" },
      { score: 4, label: "Active strategic partner or distribution channel exists" },
      { score: 5, label: "Strong strategic agreements that provide direct market access" },
    ],
  },
  {
    name: "Product Rollout / Early Traction",
    subtitle: "Revenue & Traction Risk",
    question: "What is the startup's current level of initial traction and revenue in the market?",
    options: [
      { score: 0, label: "No users or revenue" },
      { score: 1, label: "A limited number of test users" },
      { score: 2, label: "Beta users exist" },
      { score: 3, label: "Initial revenue has been generated" },
      { score: 4, label: "Growing user base or revenue momentum" },
      { score: 5, label: "Strong and sustainable growth is observed" },
    ],
  },
];

interface BerkusMethodProps {
  onValuationChange?: (value: number) => void;
}

const BerkusMethod = ({ onValuationChange }: BerkusMethodProps) => {
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

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {components.map((comp, i) => (
          <div key={comp.name} className="rounded-xl border border-border bg-card p-5 shadow-card">
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
                  <RadioGroupItem value={String(opt.score)} id={`${comp.name}-${opt.score}`} className="mt-0.5" />
                  <Label
                    htmlFor={`${comp.name}-${opt.score}`}
                    className="text-sm cursor-pointer flex-1 leading-relaxed"
                  >
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

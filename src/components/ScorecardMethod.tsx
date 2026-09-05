import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  SCORECARD_FACTOR_KEYS, SCORECARD_SCORE_KEYS, SCORECARD_SCORE_VALUES,
  SCORECARD_WEIGHTS, computeScorecard, computeScorecardWeight,
} from "@/lib/analyst/methodologies/scorecard";

// Factors, weights and the score grid are shared with the Scorecard agent.
const factorKeys = [...SCORECARD_FACTOR_KEYS];
const weights = SCORECARD_WEIGHTS;
const scoreValues = SCORECARD_SCORE_VALUES;
const scoreKeys = SCORECARD_SCORE_KEYS;
const scoreColors = ["var(--negative)", "var(--caution)", "#9aa0ab", "var(--positive)", "var(--accent-ink)"];

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
  const weightedScore = computeScorecardWeight(scores);
  const finalValuation = computeScorecard(scores, median);

  useEffect(() => { onValuationChange?.(finalValuation); }, [finalValuation, onValuationChange]);

  const updateScore = (idx: number, value: number) => {
    const next = [...scores];
    next[idx] = value;
    onScoresChange(next);
  };

  return (
    <div className="space-y-5">
      {/* Live valuation header */}
      <div className="flex flex-col gap-4 rounded-3xl p-7 card-ocean sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] uppercase tracking-[0.25em] text-[var(--ink-2)]">{t("eval.scorecard_tab")}</p>
          <p className="mt-3 font-origin-display text-4xl font-medium text-[var(--ink-1)]">${finalValuation.toLocaleString()}</p>
        </div>
        <p className="text-sm text-[var(--ink-2)]">{Math.round(weightedScore * 100)}% weighted</p>
      </div>

      {/* Base value */}
      <div className="rounded-3xl border border-[var(--rule)] bg-card p-6">
        <h3 className="font-origin-display text-lg font-medium text-[var(--ink-1)]">{t("scorecard.base_val")}</h3>
        <p className="mt-1 text-sm text-[var(--ink-2)] font-light">{t("scorecard.base_val_desc")}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-lg text-[var(--ink-2)]">$</span>
          <Input type="number" placeholder="e.g. 3000000" value={medianValuation || ""} onChange={(e) => onMedianChange(parseFloat(e.target.value) || 0)} className="max-w-xs text-lg" />
          <span className="text-sm text-[var(--ink-3)]">USD</span>
        </div>
      </div>

      {factorKeys.map((key, i) => (
        <motion.div key={key} className="rounded-3xl border border-[var(--rule)] bg-card p-6"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.45 }}>
          <h3 className="font-origin-display text-xl font-medium text-[var(--ink-1)]">{i + 1}. {t(`scorecard.${key}`)}</h3>
          <p className="mt-3 text-sm text-[var(--ink-2)] font-light">{t(`scorecard.${key}_q`)}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {scoreValues.map((val, si) => {
              const active = scores[i] === val;
              return (
                <button key={val} type="button" onClick={() => updateScore(i, val)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all ${
                    active ? "border-[color-mix(in_srgb,var(--accent-ink)_60%,transparent)] bg-[color-mix(in_srgb,var(--accent-ink)_10%,transparent)]" : "border-[var(--rule)] hover:border-[var(--rule)]"
                  }`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-[var(--accent-ink)] bg-[var(--accent-ink)]" : "border-[var(--rule)]"}`}>
                    {active && <Check className="h-3 w-3 text-[var(--ink-1)]" />}
                  </span>
                  <span className="text-center text-xs font-medium" style={{ color: scoreColors[si] }}>{t(`scorecard.${scoreKeys[si]}`)}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ScorecardMethod;

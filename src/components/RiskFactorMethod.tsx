import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  RISK_ADJUSTMENT_PER_POINT, RISK_BASE_VALUATION, RISK_KEYS,
  RISK_SCORE_KEYS, RISK_SCORE_VALUES, computeRiskFactor,
} from "@/lib/analyst/methodologies/riskFactor";

// Categories, step size and base valuation are shared with the Risk Factor agent.
const ADJUSTMENT_PER_POINT = RISK_ADJUSTMENT_PER_POINT;
const riskKeys = [...RISK_KEYS];
const scoreValues = RISK_SCORE_VALUES;
const scoreKeys = RISK_SCORE_KEYS;
const scoreColors = ["var(--negative)", "var(--caution)", "#9aa0ab", "var(--positive)", "var(--accent-ink)"];

interface RiskFactorMethodProps {
  scores: (number | null)[];
  onScoresChange: (scores: (number | null)[]) => void;
  onValuationChange?: (value: number) => void;
}

const RiskFactorMethod = ({ scores, onScoresChange, onValuationChange }: RiskFactorMethodProps) => {
  const { t } = useLanguage();
  const baseValuation = RISK_BASE_VALUATION;
  const valuation = computeRiskFactor(scores, baseValuation);
  const answered = scores.filter((s) => s !== null).length;

  useEffect(() => { onValuationChange?.(valuation); }, [valuation, onValuationChange]);

  const updateScore = (idx: number, value: number) => {
    const next = [...scores];
    next[idx] = value;
    onScoresChange(next);
  };

  return (
    <div className="space-y-5">
      {/* Live valuation header */}
      <div className="flex flex-col gap-4 rounded-3xl p-7 card-rose sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] uppercase tracking-[0.25em] text-[var(--ink-2)]">{t("eval.risk_tab")}</p>
          <p className="mt-3 font-origin-display text-4xl font-medium text-[var(--ink-1)]">${valuation.toLocaleString()}</p>
        </div>
        <p className="text-sm text-[var(--ink-2)]">{answered} / {riskKeys.length} answered</p>
      </div>

      <div className="rounded-3xl border border-[var(--rule)] bg-card p-6">
        <h3 className="font-origin-display text-lg font-medium text-[var(--ink-1)]">{t("risk.base_val")}</h3>
        <p className="mt-1 text-sm text-[var(--ink-2)] font-light">{t("risk.base_val_desc")}</p>
      </div>

      {riskKeys.map((key, i) => {
        return (
          <motion.div key={key} className="rounded-3xl border border-[var(--rule)] bg-card p-6"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.4 }}>
            <h3 className="font-origin-display text-xl font-medium text-[var(--ink-1)]">{i + 1}. {t(`risk.${key}`)}</h3>
            <p className="mt-3 text-sm text-[var(--ink-2)] font-light">{t(`risk.${key}_q`)}</p>
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
                    <span className="text-center text-xs font-medium" style={{ color: scoreColors[si] }}>{t(`risk.${scoreKeys[si]}`)}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default RiskFactorMethod;

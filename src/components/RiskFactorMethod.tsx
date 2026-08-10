import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const ADJUSTMENT_PER_POINT = 250000;

const riskKeys = [
  "management", "stage", "legislation", "supply", "sales_marketing",
  "funding", "competition", "technology", "international", "reputation",
  "exit", "political",
];

const scoreValues = [-2, -1, 0, 1, 2];
const scoreKeys = ["very_high", "high", "average", "low", "very_low"];
const scoreColors = ["#dd90d8", "#e0a36a", "#9aa0ab", "#00b3dd", "#847dff"];

interface RiskFactorMethodProps {
  scores: (number | null)[];
  onScoresChange: (scores: (number | null)[]) => void;
  onValuationChange?: (value: number) => void;
}

const RiskFactorMethod = ({ scores, onScoresChange, onValuationChange }: RiskFactorMethodProps) => {
  const { t } = useLanguage();
  const baseValuation = 250000;

  const totalAdjustment = scores.reduce((sum, s) => sum + (s !== null ? s * ADJUSTMENT_PER_POINT : 0), 0);
  const valuation = Math.max(0, baseValuation + totalAdjustment);
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
          <p className="text-[12px] uppercase tracking-[0.25em] text-white/70">{t("eval.risk_tab")}</p>
          <p className="mt-3 font-origin-display text-4xl font-medium text-white">${valuation.toLocaleString()}</p>
        </div>
        <p className="text-sm text-white/70">{answered} / {riskKeys.length} answered</p>
      </div>

      <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
        <h3 className="font-origin-display text-lg font-medium text-white">{t("risk.base_val")}</h3>
        <p className="mt-1 text-sm text-white/55 font-light">{t("risk.base_val_desc")}</p>
      </div>

      {riskKeys.map((key, i) => {
        return (
          <motion.div key={key} className="rounded-3xl border border-white/[0.07] bg-card p-6"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.4 }}>
            <h3 className="font-origin-display text-xl font-medium text-white">{i + 1}. {t(`risk.${key}`)}</h3>
            <p className="mt-3 text-sm text-white/65 font-light">{t(`risk.${key}_q`)}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {scoreValues.map((val, si) => {
                const active = scores[i] === val;
                return (
                  <button key={val} type="button" onClick={() => updateScore(i, val)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all ${
                      active ? "border-[#847dff]/60 bg-[#847dff]/10" : "border-white/[0.07] hover:border-white/20"
                    }`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-[#847dff] bg-[#847dff]" : "border-white/25"}`}>
                      {active && <Check className="h-3 w-3 text-white" />}
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

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const factorKeys = ["team", "market", "product", "competitive", "sales", "financing", "other"];
const weights = [0.30, 0.25, 0.15, 0.10, 0.10, 0.05, 0.05];
const weightLabels = ["30%", "25%", "15%", "10%", "10%", "5%", "5%"];
const scoreValues = [60, 80, 100, 120, 150];
const scoreKeys = ["very_weak", "weak", "average", "strong", "very_strong"];
const scoreColors = ["#dd90d8", "#e0a36a", "#9aa0ab", "#00b3dd", "#847dff"];

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
  const weightedScore = factorKeys.reduce((sum, _, i) => {
    const score = scores[i] !== null ? scores[i]! / 100 : 0;
    return sum + score * weights[i];
  }, 0);
  const finalValuation = Math.round(median * weightedScore);

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
          <p className="text-[12px] uppercase tracking-[0.25em] text-white/70">{t("eval.scorecard_tab")}</p>
          <p className="mt-3 font-origin-display text-4xl font-medium text-white">${finalValuation.toLocaleString()}</p>
        </div>
        <p className="text-sm text-white/70">{Math.round(weightedScore * 100)}% weighted</p>
      </div>

      {/* Base value */}
      <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
        <h3 className="font-origin-display text-lg font-medium text-white">{t("scorecard.base_val")}</h3>
        <p className="mt-1 text-sm text-white/55 font-light">{t("scorecard.base_val_desc")}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-lg text-white/60">$</span>
          <Input type="number" placeholder="e.g. 3000000" value={medianValuation || ""} onChange={(e) => onMedianChange(parseFloat(e.target.value) || 0)} className="max-w-xs text-lg" />
          <span className="text-sm text-white/45">USD</span>
        </div>
      </div>

      {/* Weights overview */}
      <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
        <p className="text-[12px] uppercase tracking-[0.25em] text-white/40">{t("scorecard.factor_weights")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {factorKeys.map((key, i) => (
            <div key={key} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
              <p className="text-xs text-white/50">{t(`scorecard.${key}`)}</p>
              <p className="font-origin-display text-lg text-white">{weightLabels[i]}</p>
            </div>
          ))}
        </div>
      </div>

      {factorKeys.map((key, i) => (
        <motion.div key={key} className="rounded-3xl border border-white/[0.07] bg-card p-6"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.45 }}>
          <div className="flex items-center justify-between">
            <h3 className="font-origin-display text-xl font-medium text-white">{i + 1}. {t(`scorecard.${key}`)}</h3>
            <span className="rounded-full bg-[#847dff]/15 px-3 py-1 text-xs text-[#b9a7ff]">{t("scorecard.weight")}: {weightLabels[i]}</span>
          </div>
          <p className="mt-3 text-sm text-white/65 font-light">{t(`scorecard.${key}_q`)}</p>
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

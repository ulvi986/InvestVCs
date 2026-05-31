import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const scoreToValue: Record<number, number> = {
  0: 0, 1: 70000, 2: 150000, 3: 250000, 4: 400000, 5: 500000,
};

const componentKeys = ["sound_idea", "prototype", "team", "strategic", "traction"];

interface BerkusMethodProps {
  scores: (number | null)[];
  onScoresChange: (scores: (number | null)[]) => void;
  onValuationChange?: (value: number) => void;
}

const BerkusMethod = ({ scores, onScoresChange, onValuationChange }: BerkusMethodProps) => {
  const { t } = useLanguage();

  const values = scores.map((s) => (s !== null ? scoreToValue[s] : 0));
  const total = values.reduce((a, b) => a + b, 0);
  const answered = scores.filter((s) => s !== null).length;

  useEffect(() => {
    onValuationChange?.(total);
  }, [total, onValuationChange]);

  const updateScore = (idx: number, score: number) => {
    const next = [...scores];
    next[idx] = score;
    onScoresChange(next);
  };

  const components = componentKeys.map((key) => ({
    name: t(`berkus.${key}`),
    subtitle: t(`berkus.${key}_sub`),
    question: t(`berkus.${key}_q`),
    options: [0, 1, 2, 3, 4, 5].map((s) => ({ score: s, label: t(`berkus.${key}_${s}`) })),
  }));

  return (
    <div className="space-y-5">
      {/* Live total header */}
      <div className="flex flex-col gap-4 rounded-3xl p-7 card-violet sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] uppercase tracking-[0.25em] text-white/70">{t("eval.berkus_tab")}</p>
          <p className="mt-3 font-origin-display text-4xl font-medium text-white">${total.toLocaleString()}</p>
        </div>
        <p className="text-sm text-white/70">{answered} / 5 answered</p>
      </div>

      {components.map((comp, i) => (
        <motion.div
          key={componentKeys[i]}
          className="rounded-3xl border border-white/[0.07] bg-card p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.45 }}
        >
          <div className="flex items-start gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] font-origin-display text-lg text-white/80">
              {i + 1}
            </span>
            <div className="flex-1">
              <h3 className="font-origin-display text-xl font-medium text-white">{comp.name}</h3>
              <p className="mt-1 text-xs text-white/45">{comp.subtitle}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/65 font-light">{comp.question}</p>

          <div className="mt-4 space-y-2">
            {comp.options.map((opt) => {
              const active = scores[i] === opt.score;
              return (
                <button
                  key={opt.score}
                  type="button"
                  onClick={() => updateScore(i, opt.score)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                    active
                      ? "border-[#847dff]/60 bg-[#847dff]/10"
                      : "border-white/[0.07] hover:border-white/20 hover:bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      active ? "border-[#847dff] bg-[#847dff]" : "border-white/25"
                    }`}
                  >
                    {active && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="flex-1 text-sm leading-relaxed text-white/70">{opt.label}</span>
                  <span className="shrink-0 text-xs font-medium text-white/40">
                    ${scoreToValue[opt.score].toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default BerkusMethod;

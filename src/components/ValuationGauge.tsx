import { useMemo } from "react";

interface ValuationGaugeProps {
  value: number;
  max: number;
  label?: string;
}

const ValuationGauge = ({ value, max, label }: ValuationGaugeProps) => {
  const percentage = useMemo(() => Math.min((value / max) * 100, 100), [value, max]);

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-card p-6 text-center">
      <p className="text-[12px] uppercase tracking-[0.2em] text-white/40 mb-3">{label || "Estimated Valuation"}</p>
      <p className="font-origin-display text-3xl font-light text-origin-gradient mb-5">
        ${value.toLocaleString("en-US")}
      </p>
      <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percentage}%`, background: "linear-gradient(90deg, #847dff, #00b3dd)" }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-white/40">
        <span>$0</span>
        <span>${max.toLocaleString("en-US")}</span>
      </div>
    </div>
  );
};

export default ValuationGauge;

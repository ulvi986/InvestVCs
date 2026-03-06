import { useMemo } from "react";

interface ValuationGaugeProps {
  value: number;
  max: number;
  label?: string;
}

const ValuationGauge = ({ value, max, label }: ValuationGaugeProps) => {
  const percentage = useMemo(() => Math.min((value / max) * 100, 100), [value, max]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card text-center">
      <p className="text-sm font-medium text-muted-foreground mb-2">{label || "Estimated Valuation"}</p>
      <p className="text-3xl font-bold text-gradient mb-4">
        ${value.toLocaleString("en-US")}
      </p>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
        <span>$0</span>
        <span>${max.toLocaleString("en-US")}</span>
      </div>
    </div>
  );
};

export default ValuationGauge;

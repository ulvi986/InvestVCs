import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import ValuationGauge from "./ValuationGauge";

const components = [
  "Sound Idea",
  "Prototype",
  "Quality Management Team",
  "Strategic Partnerships",
  "Product Rollout or Sales",
];

interface BerkusMethodProps {
  onValuationChange?: (value: number) => void;
}

const BerkusMethod = ({ onValuationChange }: BerkusMethodProps) => {
  const [values, setValues] = useState<number[]>([0, 0, 0, 0, 0]);

  const total = values.reduce((a, b) => a + b, 0);

  useEffect(() => {
    onValuationChange?.(total);
  }, [total, onValuationChange]);

  const updateValue = (idx: number, val: number[]) => {
    setValues((prev) => {
      const next = [...prev];
      next[idx] = val[0];
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {components.map((name, i) => (
            <div key={name} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">{name}</span>
                <span className="text-sm font-semibold text-primary">
                  ${values[i].toLocaleString("en-US")}
                </span>
              </div>
              <Slider
                value={[values[i]]}
                onValueChange={(v) => updateValue(i, v)}
                max={500000}
                step={10000}
                className="w-full"
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>$0</span>
                <span>$500,000</span>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <ValuationGauge value={total} max={2500000} />
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Breakdown</h4>
            <div className="space-y-2">
              {components.map((name, i) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-medium text-foreground">${values[i].toLocaleString("en-US")}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-gradient">${total.toLocaleString("en-US")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BerkusMethod;

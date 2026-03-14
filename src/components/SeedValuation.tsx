import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import ValuationGauge from "./ValuationGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";

const EXIT_MULTIPLES = [5, 8, 10, 15, "other"] as const;
const DEFAULT_DISCOUNT_RATES = { worst: 50, base: 30, best: 20 };

interface SeedValuationProps {
  onValuationChange?: (value: number) => void;
}

const SeedValuation = ({ onValuationChange }: SeedValuationProps) => {
  const [revenue, setRevenue] = useState<number>(0);
  const [exitMultiple, setExitMultiple] = useState<number>(8);
  const [customMultiple, setCustomMultiple] = useState<number>(20);
  const [isOther, setIsOther] = useState(false);
  const [yearsToExit, setYearsToExit] = useState<number>(5);
  const [discountRates, setDiscountRates] = useState(DEFAULT_DISCOUNT_RATES);
  const [probabilities, setProbabilities] = useState({ worst: 20, base: 70, best: 10 });

  const exitValue = revenue * exitMultiple;

  const pvWorst = exitValue / Math.pow(1 + discountRates.worst / 100, yearsToExit);
  const pvBase = exitValue / Math.pow(1 + discountRates.base / 100, yearsToExit);
  const pvBest = exitValue / Math.pow(1 + discountRates.best / 100, yearsToExit);

  const finalValuation = Math.round(
    (pvWorst * probabilities.worst / 100) +
    (pvBase * probabilities.base / 100) +
    (pvBest * probabilities.best / 100)
  );

  useEffect(() => {
    onValuationChange?.(finalValuation);
  }, [finalValuation, onValuationChange]);

  const handleProbabilityChange = (scenario: "worst" | "base" | "best", value: number) => {
    setProbabilities(prev => {
      const updated = { ...prev, [scenario]: value };
      const total = updated.worst + updated.base + updated.best;
      if (total > 100) {
        const others = Object.keys(updated).filter(k => k !== scenario) as Array<"worst" | "base" | "best">;
        const excess = total - 100;
        const otherTotal = others.reduce((sum, k) => sum + updated[k], 0);
        if (otherTotal > 0) {
          others.forEach(k => {
            updated[k] = Math.max(0, Math.round(updated[k] - (updated[k] / otherTotal) * excess));
          });
        }
      }
      return updated;
    });
  };

  const probTotal = probabilities.worst + probabilities.base + probabilities.best;

  return (
    <div className="space-y-6">
      {/* Revenue & Exit Multiple */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected Annual Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue ($)</Label>
              <Input
                id="revenue"
                type="number"
                min={0}
                value={revenue || ""}
                onChange={e => setRevenue(Number(e.target.value) || 0)}
                placeholder="e.g. 1,000,000"
              />
              <p className="text-xs text-muted-foreground">
                Expected annual revenue at the time of exit
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exit Multiple</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={String(exitMultiple)}
              onValueChange={v => setExitMultiple(Number(v))}
              className="grid grid-cols-2 gap-3"
            >
              {EXIT_MULTIPLES.map(m => (
                <div key={m} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(m)} id={`mult-${m}`} />
                  <Label htmlFor={`mult-${m}`} className="cursor-pointer font-medium">{m}x</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="mt-3 text-xs text-muted-foreground">
              Exit Value = Revenue × Multiple = <span className="font-semibold text-foreground">${exitValue.toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Years to Exit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Years to Exit (n)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Slider
              value={[yearsToExit]}
              onValueChange={v => setYearsToExit(v[0])}
              min={1}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">1 year</span>
              <span className="font-semibold text-foreground">{yearsToExit} years</span>
              <span className="text-muted-foreground">10 years</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Discount Rates (r)
            <span className="text-xs font-normal text-muted-foreground">— Risk-adjusted rates per scenario</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(["worst", "base", "best"] as const).map(scenario => (
              <div key={scenario} className="space-y-2">
                <Label className="capitalize">{scenario} Case</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={discountRates[scenario]}
                    onChange={e => setDiscountRates(prev => ({ ...prev, [scenario]: Number(e.target.value) || 1 }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Probabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Scenario Probabilities
            {probTotal !== 100 && (
              <span className="text-xs font-normal text-destructive">
                (Total: {probTotal}% — must equal 100%)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(["worst", "base", "best"] as const).map(scenario => (
              <div key={scenario} className="space-y-2">
                <Label className="capitalize">{scenario} Case</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={probabilities[scenario]}
                    onChange={e => handleProbabilityChange(scenario, Number(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Formula Explanation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li><strong>Exit Value</strong> = Revenue × Multiple = ${exitValue.toLocaleString()}</li>
                <li><strong>Present Value</strong> = Exit Value / (1 + r)^n — discounted to today</li>
                <li><strong>Final Valuation</strong> = Σ (PV × Probability) — probability-weighted average</li>
              </ol>
              <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">PV Worst</p>
                  <p className="font-semibold text-foreground">${Math.round(pvWorst).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">PV Base</p>
                  <p className="font-semibold text-foreground">${Math.round(pvBase).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">PV Best</p>
                  <p className="font-semibold text-foreground">${Math.round(pvBest).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      <ValuationGauge value={finalValuation} max={10000000} label="Seed Valuation (DCF)" />
    </div>
  );
};

export default SeedValuation;

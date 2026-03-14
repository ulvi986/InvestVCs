import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import ValuationGauge from "./ValuationGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";

interface VCMethodProps {
  onValuationChange?: (value: number) => void;
}

const VCMethod = ({ onValuationChange }: VCMethodProps) => {
  const [revenue, setRevenue] = useState<number>(0);
  const [netIncomeMargin, setNetIncomeMargin] = useState<number>(20);
  const [exitMultiple, setExitMultiple] = useState<number>(8);
  const [customMultiple, setCustomMultiple] = useState<number>(20);
  const [isOther, setIsOther] = useState(false);
  const [exitYears, setExitYears] = useState<number>(5);
  const [requiredIRR, setRequiredIRR] = useState<number>(30);
  const [investmentAmount, setInvestmentAmount] = useState<number>(0);

  const netIncome = revenue * (netIncomeMargin / 100);
  const exitValue = revenue * exitMultiple;
  const presentValue = exitValue / Math.pow(1 + requiredIRR / 100, exitYears);
  const postMoneyValuation = presentValue;
  const preMoneyValuation = Math.max(0, postMoneyValuation - investmentAmount);
  const investorOwnership = postMoneyValuation > 0 ? (investmentAmount / postMoneyValuation) * 100 : 0;

  useEffect(() => {
    onValuationChange?.(Math.round(preMoneyValuation));
  }, [preMoneyValuation, onValuationChange]);

  return (
    <div className="space-y-6">
      {/* Revenue & Net Income Margin */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Year of Exit Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="vc-revenue">Revenue ($)</Label>
              <Input
                id="vc-revenue"
                type="number"
                min={0}
                value={revenue || ""}
                onChange={e => setRevenue(Number(e.target.value) || 0)}
                placeholder="e.g. 20,000"
              />
              <p className="text-xs text-muted-foreground">
                Expected annual revenue at the time of exit
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net Income Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="vc-margin">Margin (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="vc-margin"
                  type="number"
                  min={0}
                  max={100}
                  value={netIncomeMargin}
                  onChange={e => setNetIncomeMargin(Number(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Net Income at Exit Year: <span className="font-semibold text-foreground">${Math.round(netIncome).toLocaleString()}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exit Multiple */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exit Multiple</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={isOther ? "other" : String(exitMultiple)}
            onValueChange={v => {
              if (v === "other") {
                setIsOther(true);
                setExitMultiple(customMultiple);
              } else {
                setIsOther(false);
                setExitMultiple(Number(v));
              }
            }}
            className="grid grid-cols-2 gap-3"
          >
            {[5, 8, 10, 15].map(m => (
              <div key={m} className="flex items-center space-x-2">
                <RadioGroupItem value={String(m)} id={`vc-mult-${m}`} />
                <Label htmlFor={`vc-mult-${m}`} className="cursor-pointer font-medium">{m}x</Label>
              </div>
            ))}
            <div className="flex items-center space-x-2 col-span-2">
              <RadioGroupItem value="other" id="vc-mult-other" />
              <Label htmlFor="vc-mult-other" className="cursor-pointer font-medium">Other</Label>
              {isOther && (
                <div className="flex items-center gap-1 ml-2">
                  <Input
                    type="number"
                    min={1}
                    value={customMultiple}
                    onChange={e => {
                      const val = Number(e.target.value) || 1;
                      setCustomMultiple(val);
                      setExitMultiple(val);
                    }}
                    className="w-20 h-8"
                  />
                  <span className="text-sm text-muted-foreground">x</span>
                </div>
              )}
            </div>
          </RadioGroup>
          <p className="mt-3 text-xs text-muted-foreground">
            Exit Value = Revenue × Multiple = <span className="font-semibold text-foreground">${exitValue.toLocaleString()}</span>
          </p>
        </CardContent>
      </Card>

      {/* Exit Timing & Required IRR */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exit Timing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Slider
                value={[exitYears]}
                onValueChange={v => setExitYears(v[0])}
                min={1}
                max={10}
                step={1}
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">1 year</span>
                <span className="font-semibold text-foreground">{exitYears} years</span>
                <span className="text-muted-foreground">10 years</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required IRR (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={requiredIRR}
                  onChange={e => setRequiredIRR(Number(e.target.value) || 1)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Investor's minimum expected annual return
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Amount */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="vc-investment">Amount ($)</Label>
            <Input
              id="vc-investment"
              type="number"
              min={0}
              value={investmentAmount || ""}
              onChange={e => setInvestmentAmount(Number(e.target.value) || 0)}
              placeholder="e.g. 500,000"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Formula & Results */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">How it works (VC Method):</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li><strong>Exit Value</strong> = Revenue × Multiple = ${exitValue.toLocaleString()}</li>
                <li><strong>Present Value</strong> = Exit Value / (1 + IRR)^Years = ${Math.round(presentValue).toLocaleString()}</li>
                <li><strong>Post-Money Valuation</strong> = Present Value = ${Math.round(postMoneyValuation).toLocaleString()}</li>
                <li><strong>Pre-Money Valuation</strong> = Post Money − Investment = ${Math.round(preMoneyValuation).toLocaleString()}</li>
                <li><strong>Investor Ownership</strong> = Investment / Post Money = {investorOwnership.toFixed(1)}%</li>
              </ol>
              <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">Post-Money</p>
                  <p className="font-semibold text-foreground">${Math.round(postMoneyValuation).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">Pre-Money</p>
                  <p className="font-semibold text-foreground">${Math.round(preMoneyValuation).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-muted-foreground">Investor Ownership</p>
                  <p className="font-semibold text-foreground">{investorOwnership.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      <ValuationGauge value={Math.round(preMoneyValuation)} max={10000000} label="Pre-Money Valuation (VC Method)" />
    </div>
  );
};

export default VCMethod;

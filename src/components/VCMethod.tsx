import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import ValuationGauge from "./ValuationGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { VCAnswers } from "@/context/StartupContext";

interface VCMethodProps {
  answers: VCAnswers;
  onAnswersChange: (answers: VCAnswers) => void;
  onValuationChange?: (value: number) => void;
}

const VCMethod = ({ answers, onAnswersChange, onValuationChange }: VCMethodProps) => {
  const { t } = useLanguage();
  const { revenue, netIncomeMargin, exitMultiple, customMultiple, isOther, exitYears, requiredIRR, investmentAmount } = answers;

  const update = (patch: Partial<VCAnswers>) => onAnswersChange({ ...answers, ...patch });

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
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("vc.exit_revenue")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="vc-revenue">{t("vc.revenue")} ($)</Label>
              <Input id="vc-revenue" type="number" min={0} value={revenue || ""} onChange={e => update({ revenue: Number(e.target.value) || 0 })} placeholder="e.g. 20,000" />
              <p className="text-xs text-muted-foreground">{t("vc.revenue_desc")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("vc.net_income_margin")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="vc-margin">{t("vc.margin")} (%)</Label>
              <div className="flex items-center gap-2">
                <Input id="vc-margin" type="number" min={0} max={100} value={netIncomeMargin} onChange={e => update({ netIncomeMargin: Number(e.target.value) || 0 })} className="w-24" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("vc.net_income_at_exit")}: <span className="font-semibold text-foreground">${Math.round(netIncome).toLocaleString()}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("vc.exit_multiple")}</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup
            value={isOther ? "other" : String(exitMultiple)}
            onValueChange={v => { if (v === "other") { update({ isOther: true, exitMultiple: customMultiple }); } else { update({ isOther: false, exitMultiple: Number(v) }); } }}
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
              <Label htmlFor="vc-mult-other" className="cursor-pointer font-medium">{t("vc.other")}</Label>
              {isOther && (
                <div className="flex items-center gap-1 ml-2">
                  <Input type="number" min={1} value={customMultiple} onChange={e => { const val = Number(e.target.value) || 1; update({ customMultiple: val, exitMultiple: val }); }} className="w-20 h-8" />
                  <span className="text-sm text-muted-foreground">x</span>
                </div>
              )}
            </div>
          </RadioGroup>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("vc.exit_value_formula")}: <span className="font-semibold text-foreground">${exitValue.toLocaleString()}</span>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("vc.exit_timing")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Slider value={[exitYears]} onValueChange={v => update({ exitYears: v[0] })} min={1} max={10} step={1} />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">1 {t("vc.year")}</span>
                <span className="font-semibold text-foreground">{exitYears} {t("vc.years")}</span>
                <span className="text-muted-foreground">10 {t("vc.years")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("vc.required_irr")} (%)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input type="number" min={1} max={200} value={requiredIRR} onChange={e => update({ requiredIRR: Number(e.target.value) || 1 })} className="w-24" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("vc.irr_desc")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("vc.investment_amount")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="vc-investment">{t("vc.amount")} ($)</Label>
            <Input id="vc-investment" type="number" min={0} value={investmentAmount || ""} onChange={e => update({ investmentAmount: Number(e.target.value) || 0 })} placeholder="e.g. 500,000" />
          </div>
        </CardContent>
      </Card>


      <ValuationGauge value={Math.round(preMoneyValuation)} max={10000000} label={t("vc.pre_money_label")} />
    </div>
  );
};

export default VCMethod;

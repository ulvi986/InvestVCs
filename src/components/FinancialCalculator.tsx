import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TrendingUp, TrendingDown, Wallet, Users, Plus, X, CalendarIcon, Save, DollarSign, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import type { FinancialSnapshot } from "@/pages/PreparationPhase";

type OtherItem = { name: string; amount: string };

const DynamicItems = ({
  items, onAdd, onRemove, onChangeName, onChangeAmount, label, addLabel,
}: {
  items: OtherItem[]; onAdd: () => void; onRemove: (i: number) => void;
  onChangeName: (i: number, v: string) => void; onChangeAmount: (i: number, v: string) => void; label: string; addLabel: string;
}) => (
  <div className="py-2">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Button variant="ghost" size="sm" onClick={onAdd} className="h-7 gap-1 text-xs text-primary hover:text-primary">
        <Plus className="h-3 w-3" /> {addLabel}
      </Button>
    </div>
    {items.map((item, i) => (
      <div key={i} className="flex items-center gap-2 mb-2 ml-2">
        <Input placeholder={label} value={item.name} onChange={(e) => onChangeName(i, e.target.value)} className="flex-1 text-sm h-8" />
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">$</span>
          <Input type="number" placeholder="0" value={item.amount} onChange={(e) => onChangeAmount(i, e.target.value)} className="w-24 text-right text-sm h-8" />
        </div>
        <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    ))}
  </div>
);

const numFmt = (v: number) => {
  if (!isFinite(v) || isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">$</span>
      <Input type="number" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} className="w-32 text-right text-sm" />
    </div>
  </div>
);

const CountField = ({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div>
      <span className="text-sm text-muted-foreground">{label}</span>
      {hint && <p className="text-xs text-muted-foreground/60">{hint}</p>}
    </div>
    <Input type="number" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} className="w-32 text-right text-sm" />
  </div>
);

const ResultRow = ({ label, value, prefix = "$", suffix = "", bold = false, highlight = false }: {
  label: string; value: number; prefix?: string; suffix?: string; bold?: boolean; highlight?: boolean;
}) => (
  <div className={`flex items-center justify-between py-2 ${bold ? "border-t border-border pt-3 mt-1" : ""}`}>
    <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
    <span className={`text-sm font-medium ${highlight ? "text-gradient" : bold ? "font-bold text-foreground" : "text-foreground"}`}>
      {prefix}{numFmt(value)}{suffix}
    </span>
  </div>
);

const SectionCard = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#847dff]/15">
        <Icon className="h-4 w-4 text-[#b9a7ff]" />
      </div>
      <h3 className="font-origin-display text-xl font-medium text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

interface FinancialCalculatorProps {
  onSave: (snapshot: FinancialSnapshot) => void;
}

const FinancialCalculator = ({ onSave }: FinancialCalculatorProps) => {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Revenue
  const [productSales, setProductSales] = useState("");
  const [subscription, setSubscription] = useState("");
  const [serviceFees, setServiceFees] = useState("");
  const [otherIncomeItems, setOtherIncomeItems] = useState<OtherItem[]>([]);

  // Expenses
  const [salaries, setSalaries] = useState("");
  const [rent, setRent] = useState("");
  const [salesMarketing, setSalesMarketing] = useState("");
  const [tech, setTech] = useState("");
  const [loanPayments, setLoanPayments] = useState("");
  const [otherExpenseItems, setOtherExpenseItems] = useState<OtherItem[]>([]);
  const [taxes, setTaxes] = useState("");
  const [depreciation, setDepreciation] = useState("");
  const [legalAccounting, setLegalAccounting] = useState("");

  // Cash Flow
  const [startingCash, setStartingCash] = useState("");

  // Customer Metrics
  const [newCustomers, setNewCustomers] = useState("");
  const [totalCustomersStart, setTotalCustomersStart] = useState("");
  const [lostCustomers, setLostCustomers] = useState("");
  const [avgPurchaseValue, setAvgPurchaseValue] = useState("");
  const [totalProductRevenue, setTotalProductRevenue] = useState("");
  const [totalProductionCosts, setTotalProductionCosts] = useState("");

  // Profitability
  const [costOfInvestment, setCostOfInvestment] = useState("");
  const [initialValue, setInitialValue] = useState("");
  const [numberOfPeriods, setNumberOfPeriods] = useState("");

  const n = (v: string) => parseFloat(v) || 0;
  const sumItems = (items: OtherItem[]) => items.reduce((s, it) => s + n(it.amount), 0);

  const otherIncomeTotal = sumItems(otherIncomeItems);
  const otherExpenseTotal = sumItems(otherExpenseItems);

  const calcs = useMemo(() => {
    const totalRevenue = n(productSales) + n(subscription) + n(serviceFees) + otherIncomeTotal;
    const totalExpenses = n(salaries) + n(rent) + n(salesMarketing) + n(tech) + n(loanPayments) + otherExpenseTotal + n(taxes) + n(depreciation) + n(legalAccounting);
    const cashInflow = totalRevenue;
    const cashOutflow = totalExpenses;
    const endingCash = n(startingCash) + cashInflow - cashOutflow;
    const monthlyBurnRate = totalRevenue - totalExpenses;
    const runway = monthlyBurnRate !== 0 ? endingCash / Math.abs(monthlyBurnRate) : NaN;
    const activeUsers = n(totalCustomersStart) + n(newCustomers) - n(lostCustomers);
    const churnRate = n(totalCustomersStart) > 0 ? n(lostCustomers) / n(totalCustomersStart) : NaN;
    const totalCustomers = n(totalCustomersStart);
    const arpu = totalCustomers > 0 ? totalRevenue / totalCustomers : NaN;
    const avgRevenuePerCustomerPerMonth = activeUsers > 0 ? totalRevenue / activeUsers : NaN;
    const customerLifetime = churnRate > 0 ? 1 / churnRate : NaN;
    const cac = n(newCustomers) > 0 ? n(salesMarketing) / n(newCustomers) : NaN;
    const grossProfit = n(totalProductRevenue) - n(totalProductionCosts);
    const grossMargin = n(totalProductRevenue) > 0 ? grossProfit / n(totalProductRevenue) : NaN;
    const cltv = isFinite(customerLifetime) && isFinite(grossMargin) && isFinite(arpu) ? arpu * grossMargin * customerLifetime : NaN;
    const netProfit = totalRevenue - totalExpenses;
    const pv = endingCash;
    const roi = n(costOfInvestment) > 0 ? ((pv - n(costOfInvestment)) / n(costOfInvestment)) * 100 : NaN;
    const growthRate = n(initialValue) > 0 ? ((pv - n(initialValue)) / n(initialValue)) * 100 : NaN;
    const cagr = n(initialValue) > 0 && n(numberOfPeriods) > 0 ? (Math.pow(pv / n(initialValue), 1 / n(numberOfPeriods)) - 1) * 100 : NaN;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : NaN;
    const profitPercentage = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : NaN;

    return { totalRevenue, totalExpenses, cashInflow, cashOutflow, endingCash, monthlyBurnRate, runway, activeUsers, churnRate, arpu, avgRevenuePerCustomerPerMonth, customerLifetime, cac, grossProfit, grossMargin, cltv, roi, growthRate, cagr, profitMargin, profitPercentage };
  }, [productSales, subscription, serviceFees, otherIncomeTotal, salaries, rent, salesMarketing, tech, loanPayments, otherExpenseTotal, taxes, depreciation, legalAccounting, startingCash, newCustomers, totalCustomersStart, lostCustomers, totalProductRevenue, totalProductionCosts, costOfInvestment, initialValue, numberOfPeriods]);

  const addItem = (setter: React.Dispatch<React.SetStateAction<OtherItem[]>>) => setter((prev) => [...prev, { name: "", amount: "" }]);
  const removeItem = (setter: React.Dispatch<React.SetStateAction<OtherItem[]>>, i: number) => setter((prev) => prev.filter((_, idx) => idx !== i));
  const updateItemName = (setter: React.Dispatch<React.SetStateAction<OtherItem[]>>, i: number, v: string) => setter((prev) => prev.map((it, idx) => (idx === i ? { ...it, name: v } : it)));
  const updateItemAmount = (setter: React.Dispatch<React.SetStateAction<OtherItem[]>>, i: number, v: string) => setter((prev) => prev.map((it, idx) => (idx === i ? { ...it, amount: v } : it)));

  const handleSave = () => {
    if (!selectedDate) {
      toast.error(t("financial.pick_date"));
      return;
    }
    const snapshot: FinancialSnapshot = {
      id: crypto.randomUUID(),
      date: selectedDate,
      revenue: {
        productSales: n(productSales), subscription: n(subscription), serviceFees: n(serviceFees),
        otherIncome: otherIncomeTotal, total: calcs.totalRevenue,
      },
      expenses: {
        salaries: n(salaries), rent: n(rent), salesMarketing: n(salesMarketing), tech: n(tech),
        loanPayments: n(loanPayments), otherExpenses: otherExpenseTotal, taxes: n(taxes),
        depreciation: n(depreciation), legalAccounting: n(legalAccounting), total: calcs.totalExpenses,
      },
      cashFlow: {
        startingCash: n(startingCash), cashInflow: calcs.cashInflow, cashOutflow: calcs.cashOutflow,
        endingCash: calcs.endingCash, monthlyBurnRate: calcs.monthlyBurnRate, runway: calcs.runway,
      },
      customerMetrics: {
        newCustomers: n(newCustomers), totalCustomersStart: n(totalCustomersStart), lostCustomers: n(lostCustomers),
        activeUsers: calcs.activeUsers, arpu: calcs.arpu, avgRevenuePerCustomerPerMonth: calcs.avgRevenuePerCustomerPerMonth,
        churnRate: calcs.churnRate, customerLifetime: calcs.customerLifetime,
        cac: calcs.cac, grossProfit: calcs.grossProfit, grossMargin: calcs.grossMargin, cltv: calcs.cltv,
      },
      profitability: {
        costOfInvestment: n(costOfInvestment), initialValue: n(initialValue), numberOfPeriods: n(numberOfPeriods),
        roi: calcs.roi, growthRate: calcs.growthRate, cagr: calcs.cagr,
        profitMargin: calcs.profitMargin, profitPercentage: calcs.profitPercentage,
      },
    };
    onSave(snapshot);
    toast.success(`${t("financial.save_dashboard")} — ${format(selectedDate, "dd MMM yyyy")}`);
  };

  return (
    <div className="space-y-6">
      {/* Date Picker & Save */}
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/[0.07] bg-card p-6">
        <div className="flex items-center gap-3 flex-1">
          <CalendarIcon className="h-5 w-5 text-[#847dff]" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t("financial.select_date")}</p>
            <p className="text-xs text-muted-foreground">{t("financial.select_date_desc")}</p>
          </div>
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "dd MMM yyyy") : <span>{t("financial.pick_date")}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setCalendarOpen(false); }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> {t("financial.save_dashboard")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue */}
        <SectionCard icon={TrendingUp} title={t("financial.revenue_income")}>
          <div className="divide-y divide-border/50">
            <Field label={t("financial.product_sales")} value={productSales} onChange={setProductSales} />
            <Field label={t("financial.subscription")} value={subscription} onChange={setSubscription} />
            <Field label={t("financial.service_fees")} value={serviceFees} onChange={setServiceFees} />
            <DynamicItems label={t("financial.other_income")} addLabel={t("financial.add")} items={otherIncomeItems} onAdd={() => addItem(setOtherIncomeItems)} onRemove={(i) => removeItem(setOtherIncomeItems, i)} onChangeName={(i, v) => updateItemName(setOtherIncomeItems, i, v)} onChangeAmount={(i, v) => updateItemAmount(setOtherIncomeItems, i, v)} />
          </div>
          <ResultRow label={t("financial.total_revenue")} value={calcs.totalRevenue} bold highlight />
        </SectionCard>

        {/* Expenses */}
        <SectionCard icon={TrendingDown} title={t("financial.expenses")}>
          <div className="divide-y divide-border/50">
            <Field label={t("financial.salaries")} value={salaries} onChange={setSalaries} />
            <Field label={t("financial.rent")} value={rent} onChange={setRent} />
            <Field label={t("financial.sales_marketing")} value={salesMarketing} onChange={setSalesMarketing} />
            <Field label={t("financial.tech")} value={tech} onChange={setTech} />
            <Field label={t("financial.loan_payments")} value={loanPayments} onChange={setLoanPayments} />
            <DynamicItems label={t("financial.other_expenses")} addLabel={t("financial.add")} items={otherExpenseItems} onAdd={() => addItem(setOtherExpenseItems)} onRemove={(i) => removeItem(setOtherExpenseItems, i)} onChangeName={(i, v) => updateItemName(setOtherExpenseItems, i, v)} onChangeAmount={(i, v) => updateItemAmount(setOtherExpenseItems, i, v)} />
            <Field label={t("financial.taxes")} value={taxes} onChange={setTaxes} />
            <Field label={t("financial.depreciation")} value={depreciation} onChange={setDepreciation} />
            <Field label={t("financial.legal_accounting")} value={legalAccounting} onChange={setLegalAccounting} />
          </div>
          <ResultRow label={t("financial.total_expenses")} value={calcs.totalExpenses} bold />
        </SectionCard>

        {/* Cash Flow */}
        <SectionCard icon={Wallet} title={t("financial.cash_flow")}>
          <div className="divide-y divide-border/50">
            <Field label={t("financial.starting_cash")} value={startingCash} onChange={setStartingCash} />
          </div>
          <div className="mt-3 space-y-0 divide-y divide-border/50">
            <ResultRow label={t("financial.cash_inflow")} value={calcs.cashInflow} />
            <ResultRow label={t("financial.cash_outflow")} value={calcs.cashOutflow} />
            <ResultRow label={t("financial.ending_cash")} value={calcs.endingCash} bold highlight />
            <ResultRow label={t("financial.monthly_burn_rate")} value={calcs.monthlyBurnRate} />
            <ResultRow label={t("financial.runway")} value={calcs.runway} prefix="" suffix={` ${t("financial.months")}`} />
          </div>
        </SectionCard>

        {/* Customer Metrics */}
        <SectionCard icon={Users} title={t("financial.customer_metrics")}>
          <div className="divide-y divide-border/50">
            <CountField label={t("financial.new_customers")} value={newCustomers} onChange={setNewCustomers} hint={t("financial.new_customers_hint")} />
            <CountField label={t("financial.total_customers_start")} value={totalCustomersStart} onChange={setTotalCustomersStart} hint={t("financial.total_customers_hint")} />
            <CountField label={t("financial.lost_customers")} value={lostCustomers} onChange={setLostCustomers} hint={t("financial.lost_customers_hint")} />
            <Field label={t("financial.avg_purchase")} value={avgPurchaseValue} onChange={setAvgPurchaseValue} />
            <Field label={t("financial.total_product_revenue")} value={totalProductRevenue} onChange={setTotalProductRevenue} />
            <Field label={t("financial.total_production_costs")} value={totalProductionCosts} onChange={setTotalProductionCosts} />
          </div>
          <div className="mt-3 space-y-0 divide-y divide-border/50">
            <ResultRow label={t("financial.active_users")} value={calcs.activeUsers} prefix="" />
            <ResultRow label={t("financial.churn_rate")} value={calcs.churnRate * 100} prefix="" suffix="%" />
            <ResultRow label={t("financial.customer_lifetime")} value={calcs.customerLifetime} prefix="" suffix={` ${t("financial.months")}`} />
            <ResultRow label={t("financial.arpu")} value={calcs.arpu} />
            <ResultRow label={t("financial.avg_rev_customer")} value={calcs.avgRevenuePerCustomerPerMonth} />
            <ResultRow label={t("financial.cac")} value={calcs.cac} />
            <ResultRow label={t("financial.gross_profit")} value={calcs.grossProfit} />
            <ResultRow label={t("financial.gross_margin")} value={calcs.grossMargin * 100} prefix="" suffix="%" />
            <ResultRow label={t("financial.cltv")} value={calcs.cltv} bold highlight />
          </div>
        </SectionCard>
      </div>

      {/* Profitability */}
      <SectionCard icon={BarChart3} title={t("financial.profitability")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="divide-y divide-border/50">
            <Field label={t("financial.cost_investment")} value={costOfInvestment} onChange={setCostOfInvestment} />
            <Field label={t("financial.initial_value")} value={initialValue} onChange={setInitialValue} />
            <CountField label={t("financial.num_periods")} value={numberOfPeriods} onChange={setNumberOfPeriods} />
          </div>
          <div className="divide-y divide-border/50">
            <ResultRow label={t("financial.roi")} value={calcs.roi} prefix="" suffix="%" />
            <ResultRow label={t("financial.growth_rate")} value={calcs.growthRate} prefix="" suffix="%" />
            <ResultRow label={t("financial.cagr")} value={calcs.cagr} prefix="" suffix="%" />
            <ResultRow label={t("financial.profit_margin")} value={calcs.profitMargin} prefix="" suffix="%" />
            <ResultRow label={t("financial.profit_percentage")} value={calcs.profitPercentage} prefix="" suffix="%" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default FinancialCalculator;

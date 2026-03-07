import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Users, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type OtherItem = { name: string; amount: string };

const DynamicItems = ({
  items,
  onAdd,
  onRemove,
  onChangeName,
  onChangeAmount,
  label,
}: {
  items: OtherItem[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChangeName: (i: number, v: string) => void;
  onChangeAmount: (i: number, v: string) => void;
  label: string;
}) => (
  <div className="py-2">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAdd}
        className="h-7 gap-1 text-xs text-primary hover:text-primary"
      >
        <Plus className="h-3 w-3" /> Add
      </Button>
    </div>
    {items.map((item, i) => (
      <div key={i} className="flex items-center gap-2 mb-2 ml-2">
        <Input
          placeholder="Name"
          value={item.name}
          onChange={(e) => onChangeName(i, e.target.value)}
          className="flex-1 text-sm h-8"
        />
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">$</span>
          <Input
            type="number"
            placeholder="0"
            value={item.amount}
            onChange={(e) => onChangeAmount(i, e.target.value)}
            className="w-24 text-right text-sm h-8"
          />
        </div>
        <button
          onClick={() => onRemove(i)}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
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

const Field = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">$</span>
      <Input
        type="number"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 text-right text-sm"
      />
    </div>
  </div>
);

const CountField = ({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div>
      <span className="text-sm text-muted-foreground">{label}</span>
      {hint && <p className="text-xs text-muted-foreground/60">{hint}</p>}
    </div>
    <Input
      type="number"
      placeholder="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-32 text-right text-sm"
    />
  </div>
);

const ResultRow = ({
  label,
  value,
  prefix = "$",
  suffix = "",
  bold = false,
  highlight = false,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  bold?: boolean;
  highlight?: boolean;
}) => (
  <div className={`flex items-center justify-between py-2 ${bold ? "border-t border-border pt-3 mt-1" : ""}`}>
    <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      {label}
    </span>
    <span
      className={`text-sm font-medium ${
        highlight ? "text-gradient" : bold ? "font-bold text-foreground" : "text-foreground"
      }`}
    >
      {prefix}{numFmt(value)}{suffix}
    </span>
  </div>
);

const SectionCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card">
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

const FinancialCalculator = () => {
  // Revenue
  const [productSales, setProductSales] = useState("");
  const [subscription, setSubscription] = useState("");
  const [serviceFees, setServiceFees] = useState("");
  const [otherIncome, setOtherIncome] = useState("");

  // Expenses
  const [salaries, setSalaries] = useState("");
  const [rent, setRent] = useState("");
  const [salesMarketing, setSalesMarketing] = useState("");
  const [tech, setTech] = useState("");
  const [loanPayments, setLoanPayments] = useState("");
  const [otherExpense, setOtherExpense] = useState("");
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

  const n = (v: string) => parseFloat(v) || 0;

  const calcs = useMemo(() => {
    const totalRevenue = n(productSales) + n(subscription) + n(serviceFees) + n(otherIncome);
    const totalExpenses =
      n(salaries) + n(rent) + n(salesMarketing) + n(tech) + n(loanPayments) +
      n(otherExpense) + n(taxes) + n(depreciation) + n(legalAccounting);

    const cashInflow = totalRevenue;
    const cashOutflow = totalExpenses;
    const endingCash = n(startingCash) + cashInflow - cashOutflow;
    const monthlyBurnRate = totalExpenses;
    const runway = monthlyBurnRate > 0 ? n(startingCash) / monthlyBurnRate : NaN;

    const activeUsers = n(totalCustomersStart) + n(newCustomers) - n(lostCustomers);
    const churnRate = n(totalCustomersStart) > 0 ? n(lostCustomers) / n(totalCustomersStart) : NaN;
    const arpu = activeUsers > 0 ? totalRevenue / activeUsers : NaN;
    const customerLifetime = churnRate > 0 ? 1 / churnRate : NaN;
    const cac = n(newCustomers) > 0 ? n(salesMarketing) / n(newCustomers) : NaN;
    const grossProfit = totalRevenue - totalExpenses;
    const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : NaN;
    const cltv = isFinite(arpu) && isFinite(customerLifetime) && isFinite(grossMargin)
      ? arpu * customerLifetime * grossMargin
      : NaN;

    return {
      totalRevenue, totalExpenses,
      cashInflow, cashOutflow, endingCash, monthlyBurnRate, runway,
      activeUsers, churnRate, arpu, customerLifetime, cac,
      grossProfit, grossMargin, cltv,
    };
  }, [
    productSales, subscription, serviceFees, otherIncome,
    salaries, rent, salesMarketing, tech, loanPayments, otherExpense, taxes, depreciation, legalAccounting,
    startingCash, newCustomers, totalCustomersStart, lostCustomers,
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Revenue */}
      <SectionCard icon={TrendingUp} title="Revenue & Income">
        <div className="divide-y divide-border/50">
          <Field label="Product Sales" value={productSales} onChange={setProductSales} />
          <Field label="Subscription / MRR" value={subscription} onChange={setSubscription} />
          <Field label="Service Fees" value={serviceFees} onChange={setServiceFees} />
          <Field label="Other Income" value={otherIncome} onChange={setOtherIncome} />
        </div>
        <ResultRow label="Total Revenue" value={calcs.totalRevenue} bold highlight />
      </SectionCard>

      {/* Expenses */}
      <SectionCard icon={TrendingDown} title="Expenses">
        <div className="divide-y divide-border/50">
          <Field label="Salaries" value={salaries} onChange={setSalaries} />
          <Field label="Rent" value={rent} onChange={setRent} />
          <Field label="Sales / Marketing" value={salesMarketing} onChange={setSalesMarketing} />
          <Field label="Tech (Server etc.)" value={tech} onChange={setTech} />
          <Field label="Loan Payments" value={loanPayments} onChange={setLoanPayments} />
          <Field label="Other" value={otherExpense} onChange={setOtherExpense} />
          <Field label="Taxes" value={taxes} onChange={setTaxes} />
          <Field label="Depreciation / Amortization" value={depreciation} onChange={setDepreciation} />
          <Field label="Legal / Accounting" value={legalAccounting} onChange={setLegalAccounting} />
        </div>
        <ResultRow label="Total Expenses" value={calcs.totalExpenses} bold />
      </SectionCard>

      {/* Cash Flow */}
      <SectionCard icon={Wallet} title="Cash Flow">
        <div className="divide-y divide-border/50">
          <Field label="Starting Cash" value={startingCash} onChange={setStartingCash} />
        </div>
        <div className="mt-3 space-y-0 divide-y divide-border/50">
          <ResultRow label="Cash Inflow" value={calcs.cashInflow} />
          <ResultRow label="Cash Outflow" value={calcs.cashOutflow} />
          <ResultRow label="Ending Cash" value={calcs.endingCash} bold highlight />
          <ResultRow label="Monthly Burn Rate" value={calcs.monthlyBurnRate} />
          <ResultRow
            label="Runway"
            value={calcs.runway}
            prefix=""
            suffix=" months"
          />
        </div>
      </SectionCard>

      {/* Customer Metrics */}
      <SectionCard icon={Users} title="Customer Metrics">
        <div className="divide-y divide-border/50">
          <CountField label="New Customers (month)" value={newCustomers} onChange={setNewCustomers} hint="New customers acquired this month" />
          <CountField label="Total Customers (start)" value={totalCustomersStart} onChange={setTotalCustomersStart} hint="Customer count at start of month" />
          <CountField label="Lost Customers" value={lostCustomers} onChange={setLostCustomers} hint="Customers lost this month" />
          <Field label="Avg Purchase Value" value={avgPurchaseValue} onChange={setAvgPurchaseValue} />
          <Field label="Total Product Revenue" value={totalProductRevenue} onChange={setTotalProductRevenue} />
          <Field label="Total Production Costs" value={totalProductionCosts} onChange={setTotalProductionCosts} />
        </div>
        <div className="mt-3 space-y-0 divide-y divide-border/50">
          <ResultRow label="Active Users" value={calcs.activeUsers} prefix="" />
          <ResultRow label="ARPU" value={calcs.arpu} />
          <ResultRow label="Churn Rate" value={calcs.churnRate * 100} prefix="" suffix="%" />
          <ResultRow label="Customer Lifetime" value={calcs.customerLifetime} prefix="" suffix=" months" />
          <ResultRow label="CAC" value={calcs.cac} />
          <ResultRow label="Gross Profit" value={calcs.grossProfit} />
          <ResultRow label="Gross Margin" value={calcs.grossMargin * 100} prefix="" suffix="%" />
          <ResultRow label="Customer Lifetime Value (CLTV)" value={calcs.cltv} bold highlight />
        </div>
      </SectionCard>
    </div>
  );
};

export default FinancialCalculator;

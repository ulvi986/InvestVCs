import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialCalculator from "@/components/FinancialCalculator";
import FinancialDashboard from "@/components/FinancialDashboard";
import { useStartupContext } from "@/context/StartupContext";

export type FinancialSnapshot = {
  id: string;
  date: Date;
  revenue: {
    productSales: number;
    subscription: number;
    serviceFees: number;
    otherIncome: number;
    total: number;
  };
  expenses: {
    salaries: number;
    rent: number;
    salesMarketing: number;
    tech: number;
    loanPayments: number;
    otherExpenses: number;
    taxes: number;
    depreciation: number;
    legalAccounting: number;
    total: number;
  };
  cashFlow: {
    startingCash: number;
    cashInflow: number;
    cashOutflow: number;
    endingCash: number;
    monthlyBurnRate: number;
    runway: number;
  };
  customerMetrics: {
    newCustomers: number;
    totalCustomersStart: number;
    lostCustomers: number;
    activeUsers: number;
    arpu: number;
    avgRevenuePerCustomerPerMonth: number;
    churnRate: number;
    customerLifetime: number;
    cac: number;
    grossProfit: number;
    grossMargin: number;
    cltv: number;
  };
  profitability: {
    costOfInvestment: number;
    initialValue: number;
    numberOfPeriods: number;
    roi: number;
    growthRate: number;
    cagr: number;
    profitMargin: number;
    profitPercentage: number;
  };
};

const PreparationPhase = () => {
  const { financial } = useStartupContext();
  const { snapshots, addSnapshot, removeSnapshot } = financial;

  return (
    <DashboardLayout title="Financial Management" subtitle="Enter your startup's financial data by date and track your progress on the dashboard.">
        <Tabs defaultValue="entry" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl h-auto gap-1">
            <TabsTrigger value="entry" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
              Data Entry
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
              📊 Dashboard
            </TabsTrigger>
          </TabsList>
          <TabsContent value="entry">
            <FinancialCalculator onSave={addSnapshot} />
          </TabsContent>
          <TabsContent value="dashboard">
            <FinancialDashboard snapshots={snapshots} onRemove={removeSnapshot} />
          </TabsContent>
        </Tabs>
    </DashboardLayout>
  );
};

export default PreparationPhase;

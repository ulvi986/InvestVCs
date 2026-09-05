// One month of company financials.
//
// Lived on the old PreparationPhase page; moved here when financial
// management became its own section, because a shared type should not
// depend on a page existing.

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

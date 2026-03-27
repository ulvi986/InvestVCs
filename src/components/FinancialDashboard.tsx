import { useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Wallet, Users, Trash2, BarChart3 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import type { FinancialSnapshot } from "@/pages/PreparationPhase";

const numFmt = (v: number) => {
  if (!isFinite(v) || isNaN(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const MetricCard = ({ icon: Icon, title, value, subtitle, color }: {
  icon: React.ElementType; title: string; value: string; subtitle?: string; color: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card">
    <div className="flex items-center gap-3 mb-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="text-sm text-muted-foreground">{title}</span>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

interface FinancialDashboardProps {
  snapshots: FinancialSnapshot[];
  onRemove: (id: string) => void;
}

const FinancialDashboard = ({ snapshots, onRemove }: FinancialDashboardProps) => {
  const { t } = useLanguage();

  // Cumulative totals across all snapshots
  const cumulative = useMemo(() => {
    const totalRevenue = snapshots.reduce((sum, s) => sum + s.revenue.total, 0);
    const totalExpenses = snapshots.reduce((sum, s) => sum + s.expenses.total, 0);
    const totalNewCustomers = snapshots.reduce((sum, s) => sum + s.customerMetrics.newCustomers, 0);
    const totalLostCustomers = snapshots.reduce((sum, s) => sum + s.customerMetrics.lostCustomers, 0);
    return { totalRevenue, totalExpenses, totalNewCustomers, totalLostCustomers };
  }, [snapshots]);

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{t("financial.no_data")}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{t("financial.no_data_desc")}</p>
      </div>
    );
  }

  const latest = snapshots[snapshots.length - 1];
  const safe = (v: number) => (isFinite(v) && !isNaN(v) ? v : 0);


  const chartData = snapshots.map((s) => ({
    date: format(s.date, "dd MMM yyyy"),
    [t("financial.total_revenue")]: s.revenue.total,
    [t("financial.total_expenses")]: s.expenses.total,
    [t("financial.profit")]: s.revenue.total - s.expenses.total,
  }));

  const cashFlowData = snapshots.map((s) => ({
    date: format(s.date, "dd MMM yyyy"),
    [t("financial.starting_cash")]: s.cashFlow.startingCash,
    [t("financial.ending_cash")]: s.cashFlow.endingCash,
    [t("financial.monthly_burn_rate")]: s.cashFlow.monthlyBurnRate,
  }));

  const customerData = snapshots.map((s) => ({
    date: format(s.date, "dd MMM yyyy"),
    [t("financial.active_users")]: safe(s.customerMetrics.activeUsers),
    [t("financial.new_customers")]: s.customerMetrics.newCustomers,
    [t("financial.lost_customers")]: s.customerMetrics.lostCustomers,
  }));

  const metricsData = snapshots.map((s) => ({
    date: format(s.date, "dd MMM yyyy"),
    ARPU: safe(s.customerMetrics.arpu),
    CAC: safe(s.customerMetrics.cac),
    CLTV: safe(s.customerMetrics.cltv),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards - Cumulative */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={TrendingUp} title={t("financial.cumulative_revenue")} value={numFmt(cumulative.totalRevenue)} subtitle={`${t("financial.latest")}: ${format(latest.date, "dd MMM yyyy")}`} color="gradient-primary" />
        <MetricCard icon={TrendingDown} title={t("financial.cumulative_expenses")} value={numFmt(cumulative.totalExpenses)} subtitle={`${t("financial.burn_rate_mo")}: ${numFmt(latest.cashFlow.monthlyBurnRate)}`} color="bg-destructive" />
        <MetricCard icon={Wallet} title={t("financial.ending_cash")} value={numFmt(latest.cashFlow.endingCash)} subtitle={safe(latest.cashFlow.runway) > 0 ? `${t("financial.runway")}: ${latest.cashFlow.runway.toFixed(1)} ${t("financial.months")}` : `${t("financial.runway")}: —`} color="bg-accent" />
        <MetricCard icon={Users} title={t("financial.active_users")} value={safe(latest.customerMetrics.activeUsers).toLocaleString()} subtitle={`${t("financial.churn_rate")}: ${safe(latest.customerMetrics.churnRate * 100).toFixed(1)}%`} color="bg-primary" />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">{t("financial.revenue_vs_expenses")}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]} />
            <Legend />
            <Area type="monotone" dataKey={t("financial.total_revenue")} stroke="hsl(217, 91%, 60%)" fill="url(#revGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey={t("financial.total_expenses")} stroke="hsl(0, 84%, 60%)" fill="url(#expGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4">{t("financial.cash_flow_chart")}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]} />
              <Legend />
              <Bar dataKey={t("financial.starting_cash")} fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t("financial.ending_cash")} fill="hsl(172, 66%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4">{t("financial.customer_metrics_chart")}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={customerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
              <Tooltip />
              <Legend />
              <Bar dataKey={t("financial.active_users")} fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t("financial.new_customers")} fill="hsl(172, 66%, 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t("financial.lost_customers")} fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ARPU / CAC / CLTV Chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">{t("financial.key_economics")}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={metricsData}>
            <defs>
              <linearGradient id="cltvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(value: number) => [`$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`, undefined]} />
            <Legend />
            <Area type="monotone" dataKey="CLTV" stroke="hsl(172, 66%, 50%)" fill="url(#cltvGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="ARPU" stroke="hsl(217, 91%, 60%)" fill="none" strokeWidth={2} />
            <Area type="monotone" dataKey="CAC" stroke="hsl(0, 84%, 60%)" fill="none" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Saved Entries Table */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">{t("financial.saved_entries")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("financial.date")}</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.total_revenue")}</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.total_expenses")}</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.profit")}</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.ending_cash")}</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.active_users")}</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{format(s.date, "dd MMM yyyy")}</td>
                  <td className="py-2.5 px-3 text-right text-foreground">{numFmt(s.revenue.total)}</td>
                  <td className="py-2.5 px-3 text-right text-foreground">{numFmt(s.expenses.total)}</td>
                  <td className={`py-2.5 px-3 text-right font-medium ${s.revenue.total - s.expenses.total >= 0 ? "text-accent" : "text-destructive"}`}>
                    {numFmt(s.revenue.total - s.expenses.total)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-foreground">{numFmt(s.cashFlow.endingCash)}</td>
                  <td className="py-2.5 px-3 text-right text-foreground">{safe(s.customerMetrics.activeUsers)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => onRemove(s.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;

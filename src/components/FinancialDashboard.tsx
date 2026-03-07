import { format } from "date-fns";
import { TrendingUp, TrendingDown, Wallet, Users, Trash2, BarChart3 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
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
  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Go to the Data Entry tab, fill in your financial data, select a date, and click "Save to Dashboard" to see your metrics here.
        </p>
      </div>
    );
  }

  const latest = snapshots[snapshots.length - 1];
  const safe = (v: number) => (isFinite(v) && !isNaN(v) ? v : 0);

  const chartData = snapshots.map((s) => ({
    date: format(s.date, "MMM yyyy"),
    Revenue: s.revenue.total,
    Expenses: s.expenses.total,
    Profit: s.revenue.total - s.expenses.total,
  }));

  const cashFlowData = snapshots.map((s) => ({
    date: format(s.date, "MMM yyyy"),
    "Starting Cash": s.cashFlow.startingCash,
    "Ending Cash": s.cashFlow.endingCash,
    "Burn Rate": s.cashFlow.monthlyBurnRate,
  }));

  const customerData = snapshots.map((s) => ({
    date: format(s.date, "MMM yyyy"),
    "Active Users": safe(s.customerMetrics.activeUsers),
    "New Customers": s.customerMetrics.newCustomers,
    "Lost Customers": s.customerMetrics.lostCustomers,
  }));

  const metricsData = snapshots.map((s) => ({
    date: format(s.date, "MMM yyyy"),
    ARPU: safe(s.customerMetrics.arpu),
    CAC: safe(s.customerMetrics.cac),
    CLTV: safe(s.customerMetrics.cltv),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={TrendingUp} title="Total Revenue" value={numFmt(latest.revenue.total)} subtitle={`Latest: ${format(latest.date, "MMM yyyy")}`} color="gradient-primary" />
        <MetricCard icon={TrendingDown} title="Total Expenses" value={numFmt(latest.expenses.total)} subtitle={`Burn Rate: ${numFmt(latest.cashFlow.monthlyBurnRate)}/mo`} color="bg-destructive" />
        <MetricCard icon={Wallet} title="Ending Cash" value={numFmt(latest.cashFlow.endingCash)} subtitle={safe(latest.cashFlow.runway) > 0 ? `Runway: ${latest.cashFlow.runway.toFixed(1)} months` : "Runway: —"} color="bg-accent" />
        <MetricCard icon={Users} title="Active Users" value={safe(latest.customerMetrics.activeUsers).toLocaleString()} subtitle={`Churn: ${safe(latest.customerMetrics.churnRate * 100).toFixed(1)}%`} color="bg-primary" />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Revenue vs Expenses</h3>
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
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]} />
            <Legend />
            <Area type="monotone" dataKey="Revenue" stroke="hsl(217, 91%, 60%)" fill="url(#revGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="Expenses" stroke="hsl(0, 84%, 60%)" fill="url(#expGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Cash Flow</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]} />
              <Legend />
              <Bar dataKey="Starting Cash" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ending Cash" fill="hsl(172, 66%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4">Customer Metrics</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={customerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Active Users" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="New Customers" fill="hsl(172, 66%, 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lost Customers" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ARPU / CAC / CLTV Chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Key Customer Economics</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={metricsData}>
            <defs>
              <linearGradient id="cltvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
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
        <h3 className="text-base font-semibold text-foreground mb-4">Saved Entries</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Revenue</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Expenses</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Profit</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Ending Cash</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Active Users</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{format(s.date, "MMM dd, yyyy")}</td>
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

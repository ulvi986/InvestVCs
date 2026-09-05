import Layout from "@/components/Layout";
import ValuationGauge from "@/components/ValuationGauge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const berkusVal = 1_850_000;
const scorecardVal = 3_375_000;
const riskVal = 2_250_000;
const average = Math.round((berkusVal + scorecardVal + riskVal) / 3);

const chartData = [
  { method: "Berkus", value: berkusVal },
  { method: "Scorecard", value: scorecardVal },
  { method: "Risk Factor", value: riskVal },
  { method: "Average", value: average },
];

const colors = [
  "hsl(228, 63%, 44%)",
  "hsl(160, 63%, 30%)",
  "hsl(280, 60%, 55%)",
  "hsl(228, 63%, 44%)",
];

const ExamplePage = () => (
  <Layout>
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Example: AI Fintech Startup</h1>
        <p className="mt-2 text-muted-foreground">
          See how a sample startup is valued using all three methods.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <ValuationGauge value={berkusVal} max={2500000} label="Berkus Method" />
        <ValuationGauge value={scorecardVal} max={6000000} label="Scorecard Method" />
        <ValuationGauge value={riskVal} max={5000000} label="Risk Factor Method" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Valuation Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 8%, 18%)" />
              <XAxis dataKey="method" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString("en-US")}`} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <ValuationGauge value={average} max={5000000} label="Final Suggested Valuation (Average)" />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-3">Calculation</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Berkus</span><span className="font-medium text-foreground">${berkusVal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Scorecard</span><span className="font-medium text-foreground">${scorecardVal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Risk Factor</span><span className="font-medium text-foreground">${riskVal.toLocaleString()}</span></div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
                <span className="text-foreground">Average</span>
                <span className="text-gradient">${average.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                (Berkus + Scorecard + Risk Factor) / 3 = ${average.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
);

export default ExamplePage;

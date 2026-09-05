// Financial management.
//
// Its own section rather than a block on the workflow page: entering a month
// of figures is deliberate work, not something you do while watching agents
// run. What is entered here is the same data the Financial agent reads, so the
// page says so rather than leaving the connection implicit.

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import PageShell from "@/components/layout/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialCalculator from "@/components/FinancialCalculator";
import FinancialDashboard from "@/components/FinancialDashboard";
import { useStartupContext } from "@/context/StartupContext";

const Financials = () => {
  const { financial } = useStartupContext();
  const { snapshots, addSnapshot, removeSnapshot } = financial;

  return (
    <PageShell
      wide
      kicker="Financial management"
      title="Revenue, burn and runway"
      standfirst="Enter a month at a time. The Financial agent reads the latest snapshot, and the trends below are what it works from."
      action={
        <div className="text-right">
          <p className="kicker">Snapshots</p>
          <p className="mt-1.5 text-[20px] tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">
            {snapshots.length}
          </p>
        </div>
      }
    >
      <Tabs defaultValue={snapshots.length ? "dashboard" : "entry"}>
        <TabsList className="flex h-auto w-full justify-start gap-6 rounded-none border-b
                             border-[var(--rule)] bg-transparent p-0">
          {[
            { value: "entry", label: "Add a snapshot" },
            { value: "dashboard", label: "Trends" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0
                         text-[13px] text-[var(--ink-3)] shadow-none
                         data-[state=active]:border-[var(--accent-ink)] data-[state=active]:bg-transparent
                         data-[state=active]:text-[var(--ink-1)] data-[state=active]:shadow-none"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="entry" className="mt-10">
          <FinancialCalculator onSave={addSnapshot} />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-10">
          <FinancialDashboard snapshots={snapshots} onRemove={removeSnapshot} />
        </TabsContent>
      </Tabs>

      <div className="mt-16 border-t border-[var(--rule)] pt-8">
        <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
          {snapshots.length
            ? "These figures are picked up automatically the next time you run an analysis."
            : "Add a snapshot and the Financial agent can judge runway and unit economics instead of skipping."}
        </p>
        <Link
          to="/workflow"
          className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-[var(--accent-ink)]
                     underline-offset-4 transition-colors hover:underline"
        >
          Back to the workflow
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </PageShell>
  );
};

export default Financials;

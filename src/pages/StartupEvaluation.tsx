import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import BerkusMethod from "@/components/BerkusMethod";
import ScorecardMethod from "@/components/ScorecardMethod";
import RiskFactorMethod from "@/components/RiskFactorMethod";
import EvaluationSummary from "@/components/EvaluationSummary";
import SeedValuation from "@/components/SeedValuation";
import SeedEvaluationSummary from "@/components/SeedEvaluationSummary";
import VCMethod from "@/components/VCMethod";
import { useStartupContext } from "@/context/StartupContext";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const PRE_SEED_TABS = ["berkus", "scorecard", "risk", "summary"] as const;
const SEED_TABS = ["vc", "chicago", "summary"] as const;

const TabNav = ({
  tabs,
  current,
  onChange,
}: {
  tabs: readonly string[];
  current: string;
  onChange: (tab: string) => void;
}) => {
  const idx = tabs.indexOf(current);
  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
      <Button variant="outline" onClick={() => onChange(tabs[idx - 1])} disabled={idx <= 0} className="gap-2">
        <ChevronLeft className="h-4 w-4" /> Back
      </Button>
      <span className="text-sm text-muted-foreground">{idx + 1} / {tabs.length}</span>
      <Button onClick={() => onChange(tabs[idx + 1])} disabled={idx >= tabs.length - 1} className="gap-2 gradient-primary text-primary-foreground border-0">
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

const StartupEvaluation = () => {
  const { evaluation } = useStartupContext();
  const { berkus, scorecard, riskFactor, setBerkus, setScorecard, setRiskFactor } = evaluation;
  const { t } = useLanguage();
  const [stage, setStage] = useState<"pre-seed" | "seed">("pre-seed");
  const [vcValue, setVcValue] = useState(0);
  const [chicagoValue, setChicagoValue] = useState(0);
  const [preSeedTab, setPreSeedTab] = useState<string>("berkus");
  const [seedTab, setSeedTab] = useState<string>("vc");

  return (
    <DashboardLayout title={t("eval.title")} subtitle="Choose your funding stage and valuation method to get an instant estimate.">
      {/* Stage Selector */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setStage("pre-seed")}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            stage === "pre-seed"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          💲 Pre-Seed
        </button>
        <button
          onClick={() => setStage("seed")}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            stage === "seed"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          🚀 Seed
        </button>
      </div>

      {stage === "pre-seed" ? (
        <Tabs value={preSeedTab} onValueChange={setPreSeedTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="berkus" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">Berkus Method</TabsTrigger>
            <TabsTrigger value="scorecard" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">Scorecard Method</TabsTrigger>
            <TabsTrigger value="risk" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">Risk Factor Method</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">📊 Summary & Advice</TabsTrigger>
          </TabsList>
          <TabsContent value="berkus"><BerkusMethod onValuationChange={setBerkus} /><TabNav tabs={PRE_SEED_TABS} current="berkus" onChange={setPreSeedTab} /></TabsContent>
          <TabsContent value="scorecard"><ScorecardMethod onValuationChange={setScorecard} /><TabNav tabs={PRE_SEED_TABS} current="scorecard" onChange={setPreSeedTab} /></TabsContent>
          <TabsContent value="risk"><RiskFactorMethod onValuationChange={setRiskFactor} /><TabNav tabs={PRE_SEED_TABS} current="risk" onChange={setPreSeedTab} /></TabsContent>
          <TabsContent value="summary"><EvaluationSummary berkus={berkus} scorecard={scorecard} riskFactor={riskFactor} /><TabNav tabs={PRE_SEED_TABS} current="summary" onChange={setPreSeedTab} /></TabsContent>
        </Tabs>
      ) : (
        <Tabs value={seedTab} onValueChange={setSeedTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="vc" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">VC Method</TabsTrigger>
            <TabsTrigger value="chicago" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">First Chicago Method</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">📊 Summary & Advice</TabsTrigger>
          </TabsList>
          <TabsContent value="vc"><VCMethod onValuationChange={setVcValue} /><TabNav tabs={SEED_TABS} current="vc" onChange={setSeedTab} /></TabsContent>
          <TabsContent value="chicago"><SeedValuation onValuationChange={setChicagoValue} /><TabNav tabs={SEED_TABS} current="chicago" onChange={setSeedTab} /></TabsContent>
          <TabsContent value="summary"><SeedEvaluationSummary vcMethod={vcValue} chicagoMethod={chicagoValue} /><TabNav tabs={SEED_TABS} current="summary" onChange={setSeedTab} /></TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default StartupEvaluation;

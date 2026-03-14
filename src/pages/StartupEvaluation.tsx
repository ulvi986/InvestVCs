import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BerkusMethod from "@/components/BerkusMethod";
import ScorecardMethod from "@/components/ScorecardMethod";
import RiskFactorMethod from "@/components/RiskFactorMethod";
import EvaluationSummary from "@/components/EvaluationSummary";
import SeedValuation from "@/components/SeedValuation";
import VCMethod from "@/components/VCMethod";
import { useStartupContext } from "@/context/StartupContext";
import { useState } from "react";

const StartupEvaluation = () => {
  const { evaluation } = useStartupContext();
  const { berkus, scorecard, riskFactor, setBerkus, setScorecard, setRiskFactor } = evaluation;
  const [stage, setStage] = useState<"pre-seed" | "seed">("pre-seed");

  return (
    <Layout>
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Startup Evaluation</h1>
          <p className="mt-2 text-muted-foreground">
            Choose your funding stage and valuation method to get an instant estimate.
          </p>
        </div>

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
            🌱 Pre-Seed
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
          <Tabs defaultValue="berkus" className="space-y-6">
            <TabsList className="bg-muted p-1 rounded-xl flex-wrap h-auto gap-1">
              <TabsTrigger value="berkus" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
                Berkus Method
              </TabsTrigger>
              <TabsTrigger value="scorecard" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
                Scorecard Method
              </TabsTrigger>
              <TabsTrigger value="risk" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
                Risk Factor Method
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
                📊 Summary & Advice
              </TabsTrigger>
            </TabsList>
            <TabsContent value="berkus">
              <BerkusMethod onValuationChange={setBerkus} />
            </TabsContent>
            <TabsContent value="scorecard">
              <ScorecardMethod onValuationChange={setScorecard} />
            </TabsContent>
            <TabsContent value="risk">
              <RiskFactorMethod onValuationChange={setRiskFactor} />
            </TabsContent>
            <TabsContent value="summary">
              <EvaluationSummary berkus={berkus} scorecard={scorecard} riskFactor={riskFactor} />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="vc" className="space-y-6">
            <TabsList className="bg-muted p-1 rounded-xl flex-wrap h-auto gap-1">
              <TabsTrigger value="vc" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
                VC Method
              </TabsTrigger>
              <TabsTrigger value="chicago" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
                First Chicago Method
              </TabsTrigger>
            </TabsList>
            <TabsContent value="vc">
              <VCMethod />
            </TabsContent>
            <TabsContent value="chicago">
              <SeedValuation />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default StartupEvaluation;

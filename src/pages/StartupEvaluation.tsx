import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BerkusMethod from "@/components/BerkusMethod";
import ScorecardMethod from "@/components/ScorecardMethod";
import RiskFactorMethod from "@/components/RiskFactorMethod";
import EvaluationSummary from "@/components/EvaluationSummary";
import { useState } from "react";

const StartupEvaluation = () => {
  const [berkusVal, setBerkusVal] = useState(0);
  const [scorecardVal, setScorecardVal] = useState(0);
  const [riskVal, setRiskVal] = useState(0);

  return (
    <Layout>
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Startup Evaluation</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a valuation method and input your startup data to get an instant estimate.
          </p>
        </div>
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
            <BerkusMethod onValuationChange={setBerkusVal} />
          </TabsContent>
          <TabsContent value="scorecard">
            <ScorecardMethod onValuationChange={setScorecardVal} />
          </TabsContent>
          <TabsContent value="risk">
            <RiskFactorMethod onValuationChange={setRiskVal} />
          </TabsContent>
          <TabsContent value="summary">
            <EvaluationSummary berkus={berkusVal} scorecard={scorecardVal} riskFactor={riskVal} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default StartupEvaluation;

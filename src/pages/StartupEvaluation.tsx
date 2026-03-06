import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BerkusMethod from "@/components/BerkusMethod";
import ScorecardMethod from "@/components/ScorecardMethod";
import RiskFactorMethod from "@/components/RiskFactorMethod";

const StartupEvaluation = () => (
  <Layout>
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Startup Evaluation</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a valuation method and input your startup data to get an instant estimate.
        </p>
      </div>
      <Tabs defaultValue="berkus" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="berkus" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
            Berkus Method
          </TabsTrigger>
          <TabsTrigger value="scorecard" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
            Scorecard Method
          </TabsTrigger>
          <TabsTrigger value="risk" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">
            Risk Factor Method
          </TabsTrigger>
        </TabsList>
        <TabsContent value="berkus">
          <BerkusMethod />
        </TabsContent>
        <TabsContent value="scorecard">
          <ScorecardMethod />
        </TabsContent>
        <TabsContent value="risk">
          <RiskFactorMethod />
        </TabsContent>
      </Tabs>
    </div>
  </Layout>
);

export default StartupEvaluation;

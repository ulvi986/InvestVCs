import Layout from "@/components/Layout";
import FinancialCalculator from "@/components/FinancialCalculator";

const PreparationPhase = () => (
  <Layout>
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Financial Management</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your startup's financial data to calculate key metrics and understand your financial health.
        </p>
      </div>
      <FinancialCalculator />
    </div>
  </Layout>
);

export default PreparationPhase;

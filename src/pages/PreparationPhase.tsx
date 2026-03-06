import Layout from "@/components/Layout";
import { Search, Target, Users, LineChart, Map, FileText } from "lucide-react";

const items = [
  { icon: Search, title: "Market Research", description: "Research your target market size, trends, and growth potential to build a data-backed case." },
  { icon: Target, title: "Problem Definition", description: "Clearly articulate the problem you're solving and why it matters to your target audience." },
  { icon: LineChart, title: "Competitive Analysis", description: "Identify direct and indirect competitors. Understand your unique positioning." },
  { icon: Users, title: "Team Formation", description: "Build a strong founding team with complementary skills and relevant experience." },
  { icon: FileText, title: "Financial Projections", description: "Prepare realistic financial models including revenue forecasts and burn rate." },
  { icon: Map, title: "Product Roadmap", description: "Define your product development milestones and go-to-market strategy." },
];

const PreparationPhase = () => (
  <Layout>
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Preparation Phase</h1>
        <p className="mt-2 text-muted-foreground">
          Complete these steps before evaluating your startup to get the most accurate valuation.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-shadow">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl gradient-primary">
              <item.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </Layout>
);

export default PreparationPhase;

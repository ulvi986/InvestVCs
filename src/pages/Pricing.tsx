import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Layout from "@/components/Layout";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Basic startup discovery and limited searches.",
    features: [
      "Basic startup discovery",
      "Limited monthly searches",
      "Community support",
    ],
    cta: "Get Started",
    to: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$2.99",
    period: "/week",
    description: "Everything you need to invest with confidence.",
    features: [
      "AI insights & startup analysis",
      "Portfolio tracking",
      "Unlimited searches",
      "Priority email support",
    ],
    cta: "Purchase",
    to: "https://polar.sh/checkout/polar_c_HLSqATQ43uZEWSbZVexf0V9xUVczrOKRNEOQv3o0Wxy",
    highlighted: true,
    polar: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Tailored for funds and large teams.",
    features: [
      "Dedicated account manager",
      "Custom integrations",
      "Team seats & SSO",
      "SLA & priority support",
    ],
    cta: "Contact Sales",
    to: "/contact",
    highlighted: false,
  },
];

const Pricing = () => {
  return (
    <Layout>
      <div className="container py-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="text-4xl font-origin-display font-light tracking-tight text-foreground sm:text-5xl">
            Simple, <span className="text-warm-gradient font-medium">transparent pricing</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground font-light">
            Choose the plan that fits your investment journey.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col ${
                plan.highlighted
                  ? "border-primary shadow-elevated ring-2 ring-primary/20"
                  : "shadow-card"
              }`}
            >
              <CardHeader>
                {plan.highlighted && (
                  <div className="mb-2 inline-block w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Most Popular
                  </div>
                )}
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-6">
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                {(plan as any).polar ? (
                  <a href={plan.to} data-polar-checkout data-polar-checkout-theme="dark" className="w-full">
                    <Button
                      className="w-full"
                      size="lg"
                      variant={plan.highlighted ? "white" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                ) : (
                  <Link to={plan.to}>
                    <Button
                      className="w-full"
                      size="lg"
                      variant={plan.highlighted ? "white" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Pricing;

import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";

const Success = () => {
  const [params] = useSearchParams();
  const checkoutId = params.get("checkout_id");

  return (
    <Layout>
      <div className="container flex min-h-[80vh] items-center justify-center py-12">
        <Card className="w-full max-w-md text-center shadow-elevated">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <div className="rounded-full bg-accent/10 p-4">
              <CheckCircle2 className="h-16 w-16 text-accent" strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Payment Successful</h1>
              <p className="text-muted-foreground">
                Your subscription has been activated successfully.
              </p>
            </div>
            {checkoutId && (
              <div className="w-full rounded-lg border border-border bg-muted/50 p-3 text-left">
                <p className="text-xs font-medium text-muted-foreground">Checkout ID</p>
                <p className="break-all font-mono text-sm text-foreground">{checkoutId}</p>
              </div>
            )}
            <Link to="/dashboard" className="w-full">
              <Button className="w-full" size="lg">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Success;

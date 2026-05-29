import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";

const Cancel = () => {
  return (
    <Layout>
      <div className="container flex min-h-[80vh] items-center justify-center py-12">
        <Card className="w-full max-w-md text-center shadow-elevated">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <div className="rounded-full bg-destructive/10 p-4">
              <XCircle className="h-16 w-16 text-destructive" strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Payment Cancelled</h1>
              <p className="text-muted-foreground">
                Your payment was not completed. You can try again anytime.
              </p>
            </div>
            <Link to="/pricing" className="w-full">
              <Button className="w-full" size="lg" variant="outline">Return to Pricing</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Cancel;

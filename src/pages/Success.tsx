import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Copy, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";

// Deterministic voucher derived from checkout_id so the user sees the same code on reload.
const generateVoucher = (seed: string) => {
  const base = (seed || `${Date.now()}`).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  let h = hash || 1;
  for (let i = 0; i < 12; i++) {
    code += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + (base.charCodeAt(i % base.length) || 7);
  }
  return `AI-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
};

const Success = () => {
  const [params] = useSearchParams();
  const checkoutId = params.get("checkout_id");
  const [voucher, setVoucher] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setVoucher(generateVoucher(checkoutId || ""));
  }, [checkoutId]);

  const copyVoucher = async () => {
    try {
      await navigator.clipboard.writeText(voucher);
      setCopied(true);
      toast({ title: "Copied!", description: "Voucher code copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please copy the code manually.", variant: "destructive" });
    }
  };

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

            {/* AI Voucher Code */}
            <div className="w-full rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-5 text-left">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Your AI Voucher Code
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Use this code to unlock AI features in your dashboard.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <code className="flex-1 break-all font-mono text-sm font-bold text-foreground">
                  {voucher || "—"}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={copyVoucher}
                  className="h-8 shrink-0"
                  aria-label="Copy voucher code"
                >
                  {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {checkoutId && (
              <div className="w-full rounded-lg border border-border bg-muted/50 p-3 text-left">
                <p className="text-xs font-medium text-muted-foreground">Checkout ID</p>
                <p className="break-all font-mono text-xs text-foreground">{checkoutId}</p>
              </div>
            )}

            <Link to="/summary" className="w-full">
              <Button className="w-full" size="lg">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Success;

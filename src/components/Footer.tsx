import { BarChart3 } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container py-12">
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
            <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          StartupEval
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} BoostStartupEvaluator. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;

import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {(title || subtitle) && (
          <div className="border-b border-border/50 bg-card/30">
            <div className="container py-6">
              {title && <h1 className="text-2xl font-bold text-foreground">{title}</h1>}
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          </div>
        )}
        <div className="container py-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DashboardLayout;

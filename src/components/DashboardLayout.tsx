import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import OriginBackground from "./OriginBackground";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <OriginBackground />
      <Navbar />
      <main className="flex-1 relative z-10">
        {(title || subtitle) && (
          <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md">
            <div className="container py-7">
              {title && (
                <h1 className="text-2xl sm:text-3xl font-origin-display font-light text-foreground">{title}</h1>
              )}
              {subtitle && <p className="text-sm text-muted-foreground mt-1.5 font-light">{subtitle}</p>}
            </div>
          </div>
        )}
        <div className="container py-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default DashboardLayout;

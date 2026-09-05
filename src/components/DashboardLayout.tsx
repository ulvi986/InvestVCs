// Shared layout for the signed-in content pages.
//
// Kept as a thin adapter over PageShell so the fourteen pages that already
// import it inherit the minimal chrome without each needing to be rewritten.
// New pages should reach for PageShell directly.

import { ReactNode } from "react";
import PageShell from "./layout/PageShell";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Wider column for pages carrying tables or grids. */
  wide?: boolean;
}

const DashboardLayout = ({ children, title, subtitle, wide = true }: DashboardLayoutProps) => (
  <PageShell title={title} standfirst={subtitle} wide={wide}>
    {children}
  </PageShell>
);

export default DashboardLayout;

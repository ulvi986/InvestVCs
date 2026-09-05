// Marketing and static page frame.
//
// Kept as a thin adapter over the site chrome so the static pages that import
// it (Pricing, Privacy, Terms, Success, Cancel) stay consistent with the rest
// of the product. New pages should use PageShell directly.

import { ReactNode } from "react";
import SiteHeader from "./layout/SiteHeader";
import SiteFooter from "./layout/SiteFooter";

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-dvh flex-col bg-[var(--page)]">
    <SiteHeader />
    <main className="flex-1">{children}</main>
    <SiteFooter />
  </div>
);

export default Layout;

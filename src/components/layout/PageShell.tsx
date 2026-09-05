// The shell every content page sits in.
//
// Header, one measured column, footer. Pages supply a title and an optional
// standfirst; the shell owns the spacing so no two pages drift apart.

import { ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export interface PageShellProps {
  children: ReactNode;
  /** Mono label above the title. */
  kicker?: string;
  title?: string;
  /** One or two sentences under the title. */
  standfirst?: string;
  /** Sits opposite the title: a filter, a count, an action. */
  action?: ReactNode;
  /** Wider column for pages that carry tables or grids. */
  wide?: boolean;
}

export const PageShell = ({
  children, kicker, title, standfirst, action, wide = false,
}: PageShellProps) => (
  <div className="flex min-h-dvh flex-col bg-[var(--page)]">
    <SiteHeader />

    <main className="flex-1">
      <div className={`mx-auto px-6 ${wide ? "max-w-[1120px]" : "max-w-[820px]"}`}>
        {(title || kicker) && (
          <header className="border-b border-[var(--rule)] pb-10 pt-16 sm:pt-20">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-0">
                {kicker && <p className="kicker">{kicker}</p>}
                {title && (
                  <h1 className="mt-3 text-[34px] leading-[1.08] tracking-[-0.03em] text-[var(--ink-1)] sm:text-[42px]">
                    {title}
                  </h1>
                )}
                {standfirst && (
                  <p className="measure mt-4 text-[15px] leading-relaxed text-[var(--ink-2)]">{standfirst}</p>
                )}
              </div>
              {action && <div className="shrink-0">{action}</div>}
            </div>
          </header>
        )}

        <div className="py-12">{children}</div>
      </div>
    </main>

    <SiteFooter />
  </div>
);

export default PageShell;

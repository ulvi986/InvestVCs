// Site header.
//
// One hairline, a wordmark, seven links, one action. Nothing else earns a place
// at the top of every page.

import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { to: "/workflow", label: "Workflow" },
  { to: "/assessment", label: "Assessment" },
  { to: "/financials", label: "Financials" },
  { to: "/growth-hub", label: "Growth Hub" },
  { to: "/pricing", label: "Pricing" },
];

export const SiteHeader = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--rule)] bg-[var(--page)]/90 backdrop-blur-[6px]">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-8 px-6">
        <Link
          to="/"
          className="shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-[var(--ink-1)]"
        >
          InvestVCS
        </Link>

        <nav className="hidden flex-1 items-center gap-7 md:flex" aria-label="Main">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-[13.5px] transition-colors ${
                  isActive ? "text-[var(--ink-1)]" : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-5 md:flex">
          {user ? (
            <Link to="/profile" className="text-[13.5px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]">
              Profile
            </Link>
          ) : (
            <Link to="/signin" className="text-[13.5px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]">
              Sign in
            </Link>
          )}
          <Link
            to={user ? "/workflow" : "/signup"}
            className="rounded-[var(--radius)] bg-[var(--ink-1)] px-3.5 py-1.5 text-[13px] font-medium
                       text-[var(--page)] transition-opacity hover:opacity-85"
          >
            {user ? "Open workflow" : "Get started"}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="ml-auto text-[var(--ink-2)] md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--rule)] md:hidden">
          <nav className="mx-auto max-w-[1120px] px-6 py-3" aria-label="Main">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="block py-2 text-[14px] text-[var(--ink-2)]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={user ? "/workflow" : "/signup"}
              onClick={() => setOpen(false)}
              className="mt-2 block py-2 text-[14px] font-medium text-[var(--accent-ink)]"
            >
              {user ? "Open workflow" : "Get started"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;

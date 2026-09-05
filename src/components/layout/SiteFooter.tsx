// Site footer. A rule, three short columns, a line of small print.

import { Link } from "react-router-dom";

const GROUPS = [
  {
    heading: "Product",
    links: [
      { to: "/workflow", label: "Workflow" },
      { to: "/financials", label: "Financials" },
      { to: "/pricing", label: "Pricing" },
      { to: "/investors", label: "Investors" },
    ],
  },
  {
    heading: "Community",
    links: [
      { to: "/growth-hub", label: "Growth Hub" },
      { to: "/community", label: "Community" },
      { to: "/vacancies", label: "Vacancies" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/contact", label: "Contact" },
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
    ],
  },
];

export const SiteFooter = () => (
  <footer className="border-t border-[var(--rule)]">
    <div className="mx-auto max-w-[1120px] px-6 py-14">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ink-1)]">InvestVCS</p>
          <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
            Autonomous agents that research, evaluate and verify a startup, then write the memo.
          </p>
        </div>

        {GROUPS.map((group) => (
          <div key={group.heading}>
            <p className="kicker">{group.heading}</p>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[13px] text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-12 border-t border-[var(--rule)] pt-6 text-[12px] text-[var(--ink-3)]">
        © {new Date().getFullYear()} InvestVCS. Analysis is decision support, not investment advice.
      </p>
    </div>
  </footer>
);

export default SiteFooter;

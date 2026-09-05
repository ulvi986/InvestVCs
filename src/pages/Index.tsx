// Landing page.
//
// Minimal by construction: a wide hero with one claim, the pipeline drawn as
// plain type, what each agent actually does, and one closing action. No
// gradients, no glass, no 3D, no cards. Whitespace and type do the work.
//
// Every section varies its composition from the one above it, so the page has
// rhythm without needing decoration.

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { useAuth } from "@/context/AuthContext";

/** The pipeline, named honestly. These are the stages that actually run. */
const PIPELINE = [
  { step: "01", name: "Understand", detail: "Reads the deck, the canvas and the financials into one structured profile." },
  { step: "02", name: "Plan", detail: "Selects only the methodologies this company's stage and data can support." },
  { step: "03", name: "Analyse", detail: "Runs the selected agents in parallel, each with its own tools and evidence." },
  { step: "04", name: "Verify", detail: "Challenges the results and explains where the methods disagree." },
  { step: "05", name: "Reconcile", detail: "Resolves the valuation range by weight and outlier, never by averaging." },
  { step: "06", name: "Write", detail: "Produces the memo from evidence the verification step accepted." },
];

const AGENTS = [
  { name: "Market", does: "Sizes the opportunity and tests whether the sizing is credible." },
  { name: "Competitor", does: "Separates a genuine moat from a head start." },
  { name: "Team & traction", does: "Separates demonstrated demand from claimed interest." },
  { name: "Business model", does: "Exposes where the model is asserted rather than designed." },
  { name: "Readiness", does: "Shows whether technology, market and capital advance together." },
  { name: "Financial", does: "Establishes whether the company survives long enough to prove its thesis." },
  { name: "Valuation", does: "Berkus, Scorecard, Risk Factor, VC and First Chicago, cross-checked." },
  { name: "Risk", does: "Forces the failure modes into the open." },
];

const PRINCIPLES = [
  {
    title: "You can see the reasoning",
    body: "Every agent reports what it was asked, which tools it drew on, how long it took and how confident it is. Open any node and read it.",
  },
  {
    title: "It says what it cannot know",
    body: "An agent without the inputs it needs is skipped and says why, instead of returning a number nobody should trust.",
  },
  {
    title: "You stay in the loop",
    body: "Put a checkpoint anywhere in the workflow. The run stops there and waits for you before anything downstream executes.",
  },
];

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--page)]">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero. Full-bleed, asymmetric, one claim. */}
        <section className="border-b border-[var(--rule)]">
          <div className="mx-auto max-w-[1120px] px-6 pb-20 pt-24 sm:pt-32">
            <p className="kicker">Investment intelligence</p>

            <h1 className="mt-6 max-w-[19ch] text-[44px] font-medium leading-[1.02] tracking-[-0.035em]
                           text-[var(--ink-1)] sm:text-[68px]">
              Evaluate a startup the way a committee would.
            </h1>

            <p className="mt-7 max-w-[54ch] text-[17px] leading-[1.6] text-[var(--ink-2)]">
              Describe the company. InvestVCS builds the workflow, runs the agents that apply to it, checks their
              claims against the evidence, and writes the memo. You watch it happen.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                to={user ? "/workflow" : "/signup"}
                className="group inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent-ink)]
                           px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                {user ? "Open the workflow" : "Start an evaluation"}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                to="/pricing"
                className="text-[14px] text-[var(--ink-2)] underline-offset-4 transition-colors hover:text-[var(--ink-1)] hover:underline"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Pipeline. An index list: dense, typographic, no boxes. */}
        <section className="border-b border-[var(--rule)]">
          <div className="mx-auto max-w-[1120px] px-6 py-20">
            <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
              <div>
                <p className="kicker">How a run works</p>
                <h2 className="mt-3 text-[26px] leading-tight tracking-[-0.025em] text-[var(--ink-1)]">
                  Six stages, in the open
                </h2>
              </div>

              <ol className="min-w-0">
                {PIPELINE.map((stage) => (
                  <li
                    key={stage.step}
                    className="grid grid-cols-[38px_1fr] gap-x-5 border-b border-[var(--rule)] py-5
                               last:border-b-0 sm:grid-cols-[38px_150px_1fr]"
                  >
                    <span className="font-mono text-[12px] tabular-nums text-[var(--ink-3)]">{stage.step}</span>
                    <span className="text-[15px] text-[var(--ink-1)]">{stage.name}</span>
                    <span className="col-span-2 mt-1 text-[13.5px] leading-relaxed text-[var(--ink-2)] sm:col-span-1 sm:mt-0">
                      {stage.detail}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Agents. A quiet two-column index, different rhythm to the list above. */}
        <section className="border-b border-[var(--rule)] bg-[var(--band)]">
          <div className="mx-auto max-w-[1120px] px-6 py-20">
            <p className="kicker">The agents</p>
            <h2 className="mt-3 max-w-[22ch] text-[26px] leading-tight tracking-[-0.025em] text-[var(--ink-1)]">
              Twelve methodologies, selected per company
            </h2>

            <div className="mt-10 grid gap-x-14 gap-y-7 sm:grid-cols-2">
              {AGENTS.map((agent) => (
                <div key={agent.name}>
                  <h3 className="text-[14.5px] font-medium text-[var(--ink-1)]">{agent.name}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--ink-2)]">{agent.does}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles. Three columns, equal weight is fine here: they are peers. */}
        <section className="border-b border-[var(--rule)]">
          <div className="mx-auto max-w-[1120px] px-6 py-20">
            <div className="grid gap-x-14 gap-y-10 md:grid-cols-3">
              {PRINCIPLES.map((principle) => (
                <div key={principle.title}>
                  <h3 className="text-[16px] leading-snug tracking-[-0.015em] text-[var(--ink-1)]">
                    {principle.title}
                  </h3>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--ink-2)]">{principle.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Close. Centred once, deliberately, because it is the only ask. */}
        <section>
          <div className="mx-auto max-w-[1120px] px-6 py-24 text-center">
            <h2 className="mx-auto max-w-[18ch] text-[30px] leading-[1.1] tracking-[-0.03em] text-[var(--ink-1)] sm:text-[38px]">
              Put a company in front of it.
            </h2>
            <p className="mx-auto mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[var(--ink-2)]">
              A description is enough to start. The deck, the canvas and the financials make it sharper.
            </p>
            <Link
              to={user ? "/workflow" : "/signup"}
              className="mt-9 inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent-ink)]
                         px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            >
              {user ? "Open the workflow" : "Start an evaluation"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;

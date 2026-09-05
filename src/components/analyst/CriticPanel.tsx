// The critic's audit, shown in full.
//
// Surfacing this is the point: an investment tool that only shows its
// conclusions is asking to be trusted, and this one is asking to be checked.

import type { Critique, Disagreement } from "@/lib/analyst/types";
import { getMethodology } from "@/lib/analyst/registry";
import { Empty, Eyebrow, Figure, Panel, SeverityTag, Tag } from "./primitives";

const nameOf = (id: string) => getMethodology(id)?.name ?? id;

const VERDICT_COPY: Record<Critique["verdict"], { label: string; tone: "neutral" | "accent" | "muted"; detail: string }> = {
  pass: { label: "Sound enough to conclude", tone: "accent", detail: "The critic found no issue that blocks a recommendation." },
  revise: { label: "Sent back for revision", tone: "neutral", detail: "The critic required specific methodologies to be re-run." },
  insufficient_data: { label: "Insufficient data", tone: "muted", detail: "The critic judged that no recommendation is defensible on this evidence." },
};

const Section = ({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) => (
  <div>
    <div className="flex items-baseline gap-2">
      <Eyebrow>{title}</Eyebrow>
      {count !== undefined && count > 0 && <Figure className="text-[11px] text-muted-foreground/70">{count}</Figure>}
    </div>
    <div className="mt-2.5">{children}</div>
  </div>
);

export const CriticPanel = ({
  critique, disagreements, iterations,
}: {
  critique: Critique | null;
  disagreements: Disagreement[];
  iterations: number;
}) => {
  if (!critique) {
    return (
      <Panel title="Cross-validation & critique">
        <Empty>
          Cross-validation did not run for this analysis. The conclusions below have not been independently challenged,
          and confidence has been capped to reflect that.
        </Empty>
      </Panel>
    );
  }

  const verdict = VERDICT_COPY[critique.verdict] ?? VERDICT_COPY.pass;
  const otherDisagreements = disagreements.filter((item) => item.id !== "valuation-spread");

  return (
    <Panel
      title="Cross-validation & critique"
      actions={
        <div className="flex items-center gap-2">
          {iterations > 1 && <Tag tone="muted">{iterations} rounds</Tag>}
          <Tag tone={verdict.tone}>{verdict.label}</Tag>
        </div>
      }
    >
      <p className="text-sm font-light leading-relaxed text-foreground/85">
        {critique.summary || verdict.detail}
      </p>

      <div className="mt-6 space-y-6">
        {critique.redFlags.length > 0 && (
          <Section title="Red flags" count={critique.redFlags.length}>
            <ul className="space-y-2.5">
              {critique.redFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-3">
                  <SeverityTag severity={flag.severity} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/90">{flag.title}</p>
                    <p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground">{flag.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {critique.unsupportedAssumptions.length > 0 && (
          <Section title="Unsupported assumptions" count={critique.unsupportedAssumptions.length}>
            <ul className="space-y-2.5">
              {critique.unsupportedAssumptions.map((item, i) => (
                <li key={i} className="rounded-lg border border-[var(--rule)] bg-[var(--band)] p-3">
                  <p className="text-sm text-foreground/90">{item.claim}</p>
                  <p className="mt-1 text-xs font-light leading-relaxed text-muted-foreground">{item.why}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground/70">From {nameOf(item.methodologyId)}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {critique.contradictions.length > 0 && (
          <Section title="Contradictions" count={critique.contradictions.length}>
            <ul className="space-y-2.5">
              {critique.contradictions.map((item, i) => (
                <li key={i} className="rounded-lg border border-[var(--rule)] bg-[var(--band)] p-3 text-sm">
                  <p className="text-foreground/90">{item.statementA}</p>
                  <p className="my-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">contradicts</p>
                  <p className="text-foreground/90">{item.statementB}</p>
                  <p className="mt-1.5 text-xs font-light text-muted-foreground">{item.why}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {critique.credibilityChecks.length > 0 && (
          <Section title="Credibility checks" count={critique.credibilityChecks.length}>
            <ul className="divide-y divide-white/[0.05]">
              {critique.credibilityChecks.map((check, i) => (
                <li key={i} className="flex items-start gap-3 py-2.5">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${check.credible ? "bg-[var(--positive)]" : "bg-[var(--negative)]"}`}
                    aria-label={check.credible ? "holds up" : "does not hold up"}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/90">{check.topic}</p>
                    <p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground">{check.assessment}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {otherDisagreements.length > 0 && (
          <Section title="Other disagreements found" count={otherDisagreements.length}>
            <ul className="space-y-2.5">
              {otherDisagreements.map((item) => (
                <li key={item.id} className="rounded-lg border border-[var(--rule)] bg-[var(--band)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground/90">{item.topic}</p>
                    <SeverityTag severity={item.severity} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {item.values.map((value, i) => (
                      <Figure key={i} className="text-xs text-muted-foreground">
                        {value.label}: <span className="text-foreground/80">{value.value.toLocaleString("en-US")}</span>
                      </Figure>
                    ))}
                  </div>
                  {item.rootCause && <p className="mt-2 text-xs font-light leading-relaxed text-muted-foreground">{item.rootCause}</p>}
                  {item.explanation && <p className="mt-1 text-xs font-light leading-relaxed text-muted-foreground">{item.explanation}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {critique.biasChecks.length > 0 && (
          <Section title="Bias checks">
            <ul className="space-y-1.5">
              {critique.biasChecks.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm font-light leading-relaxed text-muted-foreground">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {critique.rerunRequests.length > 0 && (
          <Section title="Re-runs the critic required">
            <ul className="space-y-1.5">
              {critique.rerunRequests.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  <span className="text-foreground/80">{nameOf(item.methodologyId)}</span> — {item.instruction}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Confidence ceiling">
          <p className="text-sm text-muted-foreground">
            The critic capped the confidence of any conclusion drawn from this analysis at{" "}
            <Figure className="font-medium text-foreground">{critique.confidenceCeiling.toFixed(2)}</Figure>.
          </p>
        </Section>
      </div>
    </Panel>
  );
};

export default CriticPanel;

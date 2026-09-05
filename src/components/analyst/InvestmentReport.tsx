// The final investment memo.
//
// Ordered the way an investment committee reads: the recommendation and its
// confidence first, then the case, then the evidence, then — deliberately not
// buried — what the analysis could not establish.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import type { Critique, Disagreement, InvestmentThesis, MethodologyResult, Scenario, StartupProfile } from "@/lib/analyst/types";
import { thesisToMarkdown } from "@/lib/analyst/report";
import {
  ConfidenceMeter, Empty, Eyebrow, Figure, Panel, RecommendationBadge, ScoreBar,
  SeverityTag, Tag, confidenceLabel, formatUsd,
} from "./primitives";

const ScenarioCard = ({ scenario, tone }: { scenario: Scenario; tone: "bull" | "base" | "bear" }) => {
  const accent = tone === "bull" ? "var(--positive)" : tone === "bear" ? "var(--negative)" : "var(--accent-ink)";
  return (
    <div className="rounded-xl border border-[var(--rule)] bg-[var(--band)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium" style={{ color: accent }}>{scenario.label}</p>
        <Figure className="text-xs text-muted-foreground">{(scenario.probability * 100).toFixed(0)}%</Figure>
      </div>
      {scenario.valuationUsd !== null && (
        <Figure className="mt-1.5 block text-lg text-foreground">{formatUsd(scenario.valuationUsd)}</Figure>
      )}
      <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">{scenario.narrative}</p>
      {scenario.drivers.length > 0 && (
        <ul className="mt-3 space-y-1">
          {scenario.drivers.map((driver, i) => (
            <li key={i} className="flex gap-2 text-xs font-light leading-relaxed text-muted-foreground/85">
              <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />
              <span>{driver}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const InvestmentReport = ({
  thesis, profile, results, critique, disagreements, startupName,
}: {
  thesis: InvestmentThesis | null;
  profile: StartupProfile | null;
  results: Record<string, MethodologyResult>;
  critique: Critique | null;
  disagreements: Disagreement[];
  startupName: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copyMarkdown = async () => {
    const markdown = thesisToMarkdown({ startupName, profile, thesis, results, critique, disagreements });
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable in some embedded contexts; the report stays on screen.
      setCopied(false);
    }
  };

  if (!thesis) {
    return (
      <Panel title="Investment thesis">
        <Empty>
          The investment thesis has not been generated. Any methodology results already produced are available in the
          Methodologies tab and remain valid on their own.
        </Empty>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      {/* Verdict */}
      <section className="rounded-2xl border border-[var(--rule)] bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <Eyebrow>Recommendation</Eyebrow>
            <div className="mt-3">
              <RecommendationBadge value={thesis.recommendation} size="lg" />
            </div>
            <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-foreground/85">
              {thesis.recommendationReasoning}
            </p>
          </div>

          <div className="w-full max-w-xs shrink-0 space-y-4 sm:w-64">
            {thesis.valuation.reconciled.range.point > 0 && (
              <div>
                <Eyebrow>Reconciled valuation</Eyebrow>
                <Figure className="mt-1.5 block text-2xl font-medium text-foreground">
                  {formatUsd(thesis.valuation.reconciled.range.point)}
                </Figure>
                <Figure className="text-xs text-muted-foreground">
                  {formatUsd(thesis.valuation.reconciled.range.low)} – {formatUsd(thesis.valuation.reconciled.range.high)}
                </Figure>
              </div>
            )}
            <ConfidenceMeter value={thesis.confidence.overall} label="Overall confidence" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--rule)] pt-5">
          <Tag tone="muted">Evidence quality {thesis.confidence.evidenceQuality.toFixed(2)}</Tag>
          <Tag tone="muted">Coverage {(thesis.confidence.coverage * 100).toFixed(0)}%</Tag>
          <Tag tone="muted">{confidenceLabel(thesis.confidence.overall)} confidence</Tag>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={copyMarkdown}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy as Markdown"}
            </Button>
          </div>
        </div>
      </section>

      <Panel title="Executive summary">
        <p className="text-[15px] font-light leading-relaxed text-foreground/90">{thesis.executiveSummary}</p>
      </Panel>

      <Panel title="Investment thesis">
        <p className="text-[15px] font-light leading-relaxed text-foreground/90">{thesis.thesis}</p>
      </Panel>

      {thesis.sections.length > 0 && (
        <>
          <Panel title="Dimension scores">
            <div className="space-y-0.5">
              {thesis.sections.map((section) => (
                <ScoreBar
                  key={section.key}
                  label={section.title}
                  score10={section.score10}
                  hint={`conf ${section.confidence.toFixed(2)}`}
                />
              ))}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            {thesis.sections.map((section) => (
              <Panel
                key={section.key}
                title={section.title}
                actions={
                  <div className="text-right">
                    <Figure className="block text-lg font-medium text-foreground">{section.score10.toFixed(1)}</Figure>
                    <Figure className="text-[11px] text-muted-foreground">conf {section.confidence.toFixed(2)}</Figure>
                  </div>
                }
              >
                <p className="text-sm font-light leading-relaxed text-foreground/85">{section.narrative}</p>

                {section.evidence.length > 0 && (
                  <div className="mt-4">
                    <Eyebrow>Evidence</Eyebrow>
                    <ul className="mt-2 space-y-1.5">
                      {section.evidence.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm font-light leading-relaxed text-muted-foreground">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--positive)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.keyAssumptions.length > 0 && (
                  <div className="mt-4">
                    <Eyebrow>Assumptions</Eyebrow>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {section.keyAssumptions.map((item, i) => <Tag key={i} tone="muted">{item}</Tag>)}
                    </div>
                  </div>
                )}

                {section.missingInformation.length > 0 && (
                  <div className="mt-4">
                    <Eyebrow>Missing</Eyebrow>
                    <ul className="mt-2 space-y-1.5">
                      {section.missingInformation.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm font-light leading-relaxed text-muted-foreground">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--caution)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        </>
      )}

      {/* Scenarios */}
      <Panel title="Scenarios">
        <div className="grid gap-4 md:grid-cols-3">
          <ScenarioCard scenario={thesis.bullCase} tone="bull" />
          <ScenarioCard scenario={thesis.baseCase} tone="base" />
          <ScenarioCard scenario={thesis.bearCase} tone="bear" />
        </div>
      </Panel>

      {/* Risks */}
      <Panel title="Risk analysis" subtitle={`${thesis.risks.length} risks, most serious first`}>
        {thesis.risks.length === 0 ? (
          <Empty>No risks were recorded, which is itself a finding worth questioning.</Empty>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {thesis.risks.map((risk) => (
              <li key={risk.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{risk.title}</p>
                    <p className="mt-1 text-sm font-light leading-relaxed text-muted-foreground">{risk.description}</p>
                    {risk.mitigation && (
                      <p className="mt-1.5 text-xs font-light leading-relaxed text-muted-foreground/85">
                        <span className="text-foreground/70">Mitigation:</span> {risk.mitigation}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <SeverityTag severity={risk.severity} />
                    <Figure className="text-[11px] text-muted-foreground">p {risk.likelihood.toFixed(2)}</Figure>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Confidence */}
      <Panel title="Confidence analysis">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <ConfidenceMeter value={thesis.confidence.overall} label="Overall" />
            <ConfidenceMeter value={thesis.confidence.evidenceQuality} label="Evidence quality" />
            <ConfidenceMeter value={thesis.confidence.coverage} label="Methodology coverage" />
          </div>
          <div className="lg:col-span-2">
            {thesis.confidence.drivers.length > 0 && (
              <div>
                <Eyebrow>What supports the conclusion</Eyebrow>
                <ul className="mt-2 space-y-1.5">
                  {thesis.confidence.drivers.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm font-light leading-relaxed text-muted-foreground">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--positive)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {thesis.confidence.caveats.length > 0 && (
              <div className="mt-5">
                <Eyebrow>What limits it</Eyebrow>
                <ul className="mt-2 space-y-1.5">
                  {thesis.confidence.caveats.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm font-light leading-relaxed text-muted-foreground">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--caution)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Missing information */}
      <Panel title="Missing information" subtitle="What the founder should be asked before a decision">
        {thesis.missingInformation.length === 0 ? (
          <Empty>Nothing material was flagged as missing.</Empty>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {thesis.missingInformation.map((gap, i) => (
              <li key={i} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-foreground">{gap.field}</p>
                <p className="mt-1 text-sm font-light leading-relaxed text-muted-foreground">{gap.why}</p>
                <p className="mt-1.5 text-sm text-foreground/75">“{gap.question}”</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Methodology selection */}
      <Panel title="Why these methodologies" subtitle="The analyst's reasoning for each instrument it used, or did not">
        <ul className="divide-y divide-white/[0.05]">
          {thesis.methodologySelectionExplanation.map((entry) => (
            <li key={entry.methodologyId} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${entry.used ? "bg-[var(--positive)]" : "bg-muted-foreground/35"}`}
              />
              <div className="min-w-0">
                <p className={`text-sm ${entry.used ? "text-foreground" : "text-muted-foreground"}`}>{entry.name}</p>
                <p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground">{entry.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Incompleteness */}
      {thesis.incompleteAnalysis.length > 0 && (
        <Panel title="Incomplete analysis">
          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            The recommendation above was reached without the following methodologies, which did not complete:
          </p>
          <ul className="mt-3 space-y-1.5">
            {thesis.incompleteAnalysis.map((item) => (
              <li key={item.methodologyId} className="text-sm text-muted-foreground">
                <span className="text-foreground/80">{item.methodologyId}</span> — {item.reason}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="px-1 pb-2 text-xs font-light leading-relaxed text-muted-foreground/70">
        This analysis is generated by AI from the material supplied. It is not investment advice, the figures are not
        verified against audited records, and every conclusion should be checked against primary sources before capital
        is committed.
      </p>
    </div>
  );
};

export default InvestmentReport;

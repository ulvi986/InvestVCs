// Overall summary.
//
// The founder-entered picture of the company: readiness levels, financial
// health and the valuations they calculated by hand. It sits after the run so
// the two views of the same company can be read against each other, and it
// draws on the same score module as the full summary page.

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useStartupContext } from "@/context/StartupContext";
import { computeStartupScores } from "@/lib/startupScores";
import { Empty, Eyebrow, formatUsd } from "./primitives";

const Meter = ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
  <div className="border-b border-[var(--rule)] py-3 last:border-b-0">
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[13.5px] text-[var(--ink-1)]">{label}</span>
      <span className="text-[13px] tabular-nums text-[var(--ink-2)]">
        {value > 0 ? `${value}/100` : "not entered"}
      </span>
    </div>
    <div className="bar mt-2" aria-hidden="true">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
    {hint && <p className="mt-1.5 text-[12px] text-[var(--ink-3)]">{hint}</p>}
  </div>
);

export const StartupSummaryPanel = () => {
  const { evaluation, financial, readiness } = useStartupContext();

  const scores = computeStartupScores({
    evaluation: {
      berkus: evaluation.berkus,
      scorecard: evaluation.scorecard,
      riskFactor: evaluation.riskFactor,
      vcAnswers: evaluation.vcAnswers,
      chicagoAnswers: evaluation.chicagoAnswers,
    },
    readiness: {
      trlAnswers: readiness.trlAnswers,
      crlAnswers: readiness.crlAnswers,
      frlAnswers: readiness.frlAnswers,
    },
    snapshots: financial.snapshots,
  });

  if (!scores.hasAnyData) {
    return (
      <Empty>
        Nothing entered yet. Fill in the financials below, or the valuation and readiness questionnaires, and the
        picture builds up here. The agents read the same material.
      </Empty>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
      <div>
        <Eyebrow>Overall</Eyebrow>
        <p className="mt-3 text-[52px] leading-none tracking-[-0.04em] tabular-nums text-[var(--ink-1)]">
          {scores.globalScore}
          <span className="text-[20px] text-[var(--ink-3)]">/100</span>
        </p>
        <p className="measure mt-3 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
          The mean of the modules you have filled in. Empty modules are not counted rather than scored zero.
        </p>

        {(scores.avgValuation > 0 || scores.seedAvg > 0) && (
          <dl className="mt-6 space-y-3">
            {scores.avgValuation > 0 && (
              <div>
                <dt className="kicker">Your valuation average</dt>
                <dd className="mt-1 text-[16px] tabular-nums text-[var(--ink-1)]">
                  {formatUsd(scores.avgValuation)}
                </dd>
              </div>
            )}
            {scores.seedAvg > 0 && (
              <div>
                <dt className="kicker">Seed methods average</dt>
                <dd className="mt-1 text-[16px] tabular-nums text-[var(--ink-1)]">{formatUsd(scores.seedAvg)}</dd>
              </div>
            )}
          </dl>
        )}

        <Link
          to="/summary"
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-[var(--accent-ink)]
                     underline-offset-4 transition-colors hover:underline"
        >
          Full summary
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="min-w-0">
        <Meter label="Financial health" value={scores.financialScore}
          hint={scores.hasFinancial ? undefined : "Add a financial snapshot below."} />
        <Meter label="Valuation strength" value={scores.riskScore}
          hint={scores.hasEvaluation ? undefined : "Complete a valuation method."} />
        <Meter label="Technology readiness (TRL)" value={scores.trlScore}
          hint={`Level ${scores.trlLevel} of ${scores.maxLevel}`} />
        <Meter label="Commercial readiness (CRL)" value={scores.founderScore}
          hint={`Level ${scores.crlLevel} of ${scores.maxLevel}`} />
        <Meter label="Funding readiness (FRL)" value={scores.investmentScore}
          hint={`Level ${scores.frlLevel} of ${scores.maxLevel}`} />
        <Meter label="Maturity" value={scores.maturityScore}
          hint="Weighted at 60 percent of the module average, because breadth is not the same as depth." />
      </div>
    </div>
  );
};

export default StartupSummaryPanel;

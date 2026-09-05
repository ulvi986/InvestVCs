// "Why this score?"
//
// Every factor opens onto the exact answers that produced it: the question as
// it was asked, what the founder said, how strongly that is evidenced, and
// how much weight it carried. Nothing in this system is allowed to be a
// number without a trail back to a sentence.

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  EVIDENCE_LABEL,
  EVIDENCE_WEIGHT,
  QUESTION_BY_ID,
  type FactorScore,
} from "@/lib/assessment";
import { confidenceLabel } from "@/components/analyst/primitives";

const scoreColor = (value: number): string =>
  value >= 70 ? "var(--positive)"
    : value >= 50 ? "var(--accent-ink)"
      : value >= 35 ? "var(--caution)"
        : "var(--negative)";

const EvidenceTag = ({ evidence }: { evidence: keyof typeof EVIDENCE_LABEL }) => (
  <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--ink-3)]">
    <span
      className="h-1.5 w-1.5 rounded-full"
      style={{
        background: EVIDENCE_WEIGHT[evidence] >= 0.85
          ? "var(--positive)"
          : EVIDENCE_WEIGHT[evidence] >= 0.5
            ? "var(--accent-ink)"
            : "var(--caution)",
      }}
      aria-hidden
    />
    {EVIDENCE_LABEL[evidence]}
  </span>
);

export const FactorBreakdown = ({ factors }: { factors: FactorScore[] }) => {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul>
      {factors.map((factor) => {
        const expanded = open === factor.key;
        const assessed = factor.coverage > 0;

        return (
          <li key={factor.key} className="border-b border-[var(--rule)] last:border-b-0">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : factor.key)}
                aria-expanded={expanded}
                className="group w-full py-4 text-left"
              >
                <div className="flex items-center gap-5">
                  <span className="w-32 shrink-0 text-[13.5px] text-[var(--ink-1)]">{factor.label}</span>

                  <span className="relative h-[10px] min-w-0 flex-1">
                    <span className="absolute inset-x-0 top-[4px] h-[2px] bg-[var(--rule)]" aria-hidden />
                    {assessed && (
                      <>
                        <span
                          className="absolute top-0 h-[10px] rounded-r-[3px]"
                          style={{ width: `${factor.adjusted}%`, background: scoreColor(factor.adjusted) }}
                          aria-hidden
                        />
                        {/* Where the raw reading sat before the evidence
                            haircut. The gap is the haircut. */}
                        {Math.abs(factor.raw - factor.adjusted) > 1 && (
                          <span
                            className="absolute top-[-3px] h-[16px] w-[1px]"
                            style={{ left: `${factor.raw}%`, background: "var(--ink-3)", opacity: 0.5 }}
                            aria-hidden
                          />
                        )}
                      </>
                    )}
                  </span>

                  <span className="w-9 shrink-0 text-right text-[13.5px] tabular-nums text-[var(--ink-1)]">
                    {assessed ? factor.adjusted : "—"}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-[11px] tabular-nums text-[var(--ink-3)] sm:block">
                    {assessed ? `${Math.round(factor.confidence * 100)}% conf.` : "not assessed"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-[var(--ink-3)] transition-transform ${expanded ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </div>
              </button>
            </h3>

            {expanded && (
              <div className="enter-up pb-6 pl-0 sm:pl-[148px]">
                <p className="measure text-[13px] leading-relaxed text-[var(--ink-2)]">{factor.definition}</p>

                {assessed ? (
                  <>
                    <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                      {[
                        { label: "Raw reading", value: `${factor.raw}/100` },
                        { label: "After haircut", value: `${factor.adjusted}/100` },
                        { label: "Confidence", value: `${Math.round(factor.confidence * 100)}% ${confidenceLabel(factor.confidence)}` },
                        { label: "Consistency", value: `${Math.round(factor.consistency * 100)}%` },
                      ].map((stat) => (
                        <div key={stat.label}>
                          <dt className="kicker">{stat.label}</dt>
                          <dd className="mt-1.5 text-[13.5px] tabular-nums text-[var(--ink-1)]">{stat.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="kicker mt-7">What produced this score</p>
                    <ul className="mt-3 space-y-4">
                      {factor.contributions.map((contribution) => (
                        <li key={contribution.questionId} className="border-l border-[var(--rule)] pl-4">
                          <p className="text-[12.5px] leading-relaxed text-[var(--ink-3)]">{contribution.prompt}</p>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ink-1)]">
                            {contribution.answerLabel}
                          </p>
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <EvidenceTag evidence={contribution.evidence} />
                            <span className="text-[11px] tabular-nums text-[var(--ink-3)]">
                              weight {contribution.weight.toFixed(2)}
                            </span>
                          </p>
                        </li>
                      ))}
                    </ul>

                    {factor.unanswered.length > 0 && (
                      <>
                        <p className="kicker mt-7">Would firm this up</p>
                        <ul className="mt-3 space-y-1.5">
                          {factor.unanswered.slice(0, 3).map((questionId) => (
                            <li key={questionId} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                              <span aria-hidden>·</span>
                              <span>{QUESTION_BY_ID[questionId]?.prompt ?? questionId}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                ) : (
                  <p className="mt-4 max-w-[60ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
                    Nothing in the interview has touched this factor yet, so it sits at the neutral prior and
                    contributes nothing to the score. It is shown rather than hidden because an unmeasured factor
                    is a real gap, not a zero.
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default FactorBreakdown;

// The methodology map.
//
// Seven stages between what the founder said and the range at the end, each
// one inspectable. The point of drawing it is that a valuation arriving as a
// single figure invites belief, while a valuation arriving as a chain of
// steps invites the question "which step is weakest?" — which is the question
// worth asking.

import { useState } from "react";
import { AlertTriangle, Check, ChevronRight } from "lucide-react";

import { formatUsd } from "@/components/analyst/primitives";
import type { AssessmentResult } from "@/lib/assessment";

type StageStatus = "ok" | "attention" | "idle";

interface Stage {
  key: string;
  label: string;
  summary: string;
  status: StageStatus;
  detail: React.ReactNode;
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="mt-3 space-y-2">
    {items.map((item) => (
      <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-[var(--ink-2)]">
        <span aria-hidden className="text-[var(--ink-3)]">·</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

function buildStages(result: AssessmentResult, answered: number): Stage[] {
  const ran = result.methodologies.filter((m) => m.status === "computed");
  const skipped = result.methodologies.filter((m) => m.status !== "computed");
  const openContradictions = result.contradictions.length;

  return [
    {
      key: "answers",
      label: "Answers",
      summary: `${answered} answered · ${Math.round(result.coverage * 100)}% of the interview`,
      status: result.coverage >= 0.6 ? "ok" : "attention",
      detail: (
        <>
          <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            The interview adapts as it goes: your stage answer opened the {result.stage} branch and closed the
            others. Coverage is the share of the questions that actually apply to you, not of some fixed list.
          </p>
          <Bullets
            items={[
              `${answered} questions answered.`,
              `${Math.round(result.coverage * 100)}% of the applicable questions covered.`,
              `${result.gaps.length} unanswered questions still on the table.`,
            ]}
          />
        </>
      ),
    },
    {
      key: "evidence",
      label: "Evidence extraction",
      summary: `${Math.round(result.evidenceQuality * 100)}% evidence quality`,
      status: result.evidenceQuality >= 0.6 ? "ok" : "attention",
      detail: (
        <>
          <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            Each answer is classed by where it came from — a billing export, product analytics, a signed
            agreement, or a recollection. A verified answer counts for its full weight; an estimated one counts
            for roughly a third.
          </p>
          <Bullets
            items={[
              `Weighted evidence quality across every answer: ${Math.round(result.evidenceQuality * 100)}%.`,
              "Where a question offered several sources, the source you picked set the weight, not the answer.",
            ]}
          />
        </>
      ),
    },
    {
      key: "consistency",
      label: "Consistency check",
      summary: openContradictions
        ? `${openContradictions} inconsistenc${openContradictions === 1 ? "y" : "ies"} found`
        : "No conflicts found",
      status: openContradictions ? "attention" : "ok",
      detail: (
        <>
          <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            Answers that measure the same thing from different angles are compared against each other, and a rule
            set looks for figures that cannot both be true.
          </p>
          {openContradictions ? (
            <Bullets items={result.contradictions.map((c) => `${c.title} — ${c.severity} severity.`)} />
          ) : (
            <Bullets items={["Every cross-validating pair of answers agreed within tolerance."]} />
          )}
        </>
      ),
    },
    {
      key: "confidence",
      label: "Confidence assessment",
      summary: `${Math.round(result.confidence * 100)}% overall`,
      status: result.confidence >= 0.5 ? "ok" : "attention",
      detail: (
        <>
          <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            Confidence is evidence quality × coverage × consistency, then cut for any unresolved contradiction.
            It is deliberately separate from the score: a strong claim on weak evidence keeps its score and loses
            its confidence, and the score is then pulled back toward neutral in proportion.
          </p>
          <Bullets
            items={result.factors
              .filter((factor) => factor.coverage > 0)
              .map((factor) => `${factor.label}: ${factor.adjusted}/100 at ${Math.round(factor.confidence * 100)}% confidence.`)}
          />
        </>
      ),
    },
    {
      key: "methods",
      label: "Methodologies",
      summary: `${ran.length} ran · ${skipped.length} skipped`,
      status: ran.length ? "ok" : "idle",
      detail: (
        <>
          <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            Each method is gated on stage and on the inputs it genuinely needs. A method that cannot answer
            honestly does not run, and says why.
          </p>
          <Bullets
            items={[
              ...ran.map((m) => `${m.name}: ${formatUsd(m.range!.point)} at ${Math.round(m.confidence * 100)}% confidence.`),
              ...skipped.map((m) => `${m.name}: not run — ${m.reason}`),
            ]}
          />
        </>
      ),
    },
    {
      key: "aggregation",
      label: "Aggregation",
      summary: `${Math.round(result.blend.agreement * 100)}% agreement · ${result.blend.spread.toFixed(1)}× spread`,
      status: result.blend.agreement >= 0.5 ? "ok" : "attention",
      detail: (
        <>
          <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            Methods are weighted by their own confidence rather than averaged flat, and the band is widened by
            how far apart they landed. Disagreement makes the answer less precise, which is the honest response
            to it.
          </p>
          <Bullets
            items={result.blend.weights.map(
              (weight) => `${weight.name}: ${Math.round(weight.weight * 100)}% of the blend — ${weight.rationale}`,
            )}
          />
        </>
      ),
    },
    {
      key: "range",
      label: "Valuation range",
      summary: result.valuation.point > 0
        ? `${formatUsd(result.valuation.low)} – ${formatUsd(result.valuation.high)}`
        : "Not yet computed",
      status: result.provisional ? "attention" : result.valuation.point > 0 ? "ok" : "idle",
      detail: (
        <>
          <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            The output is a range rounded to two significant figures. It is an analytical estimate from the
            evidence you supplied and the assumptions each method publishes — not a market price, and not a
            number anyone has offered.
          </p>
          <Bullets
            items={[
              `Base case ${formatUsd(result.valuation.point)}.`,
              `Band ${formatUsd(result.valuation.low)} to ${formatUsd(result.valuation.high)}.`,
              result.provisional
                ? "Provisional: an unresolved contradiction stands."
                : "No unresolved high-severity contradictions.",
            ]}
          />
        </>
      ),
    },
  ];
}

const StatusMark = ({ status }: { status: StageStatus }) => {
  if (status === "attention") {
    return <AlertTriangle className="h-3 w-3" style={{ color: "var(--caution)" }} aria-label="needs attention" />;
  }
  if (status === "ok") {
    return <Check className="h-3 w-3" style={{ color: "var(--positive)" }} aria-label="complete" />;
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-[var(--rule-strong)]" aria-label="not run" />;
};

export const MethodPipeline = ({ result, answered }: { result: AssessmentResult; answered: number }) => {
  const stages = buildStages(result, answered);
  const [selected, setSelected] = useState(stages[0].key);
  const active = stages.find((stage) => stage.key === selected) ?? stages[0];

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
      <ol className="relative">
        {/* The rail the stages hang from. */}
        <span className="absolute left-[9px] top-3 bottom-3 w-px bg-[var(--rule)]" aria-hidden />

        {stages.map((stage, index) => {
          const isActive = stage.key === selected;
          return (
            <li key={stage.key} className="relative">
              <button
                type="button"
                onClick={() => setSelected(stage.key)}
                aria-current={isActive ? "step" : undefined}
                className="flex w-full items-start gap-3 py-2.5 text-left"
              >
                <span
                  className="relative z-10 mt-[3px] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-[var(--page)]"
                  style={{ borderColor: isActive ? "var(--accent-ink)" : "var(--rule-strong)" }}
                >
                  <StatusMark status={stage.status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-[13.5px]"
                    style={{ color: isActive ? "var(--ink-1)" : "var(--ink-2)" }}
                  >
                    {index + 1}. {stage.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] tabular-nums text-[var(--ink-3)]">{stage.summary}</span>
                </span>
                <ChevronRight
                  className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]"
                  style={{ opacity: isActive ? 1 : 0.3 }}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="min-w-0 lg:border-l lg:border-[var(--rule)] lg:pl-10">
        <p className="kicker">Stage {stages.findIndex((s) => s.key === active.key) + 1} of {stages.length}</p>
        <h3 className="mt-3 text-[20px] font-medium tracking-[-0.02em] text-[var(--ink-1)]">{active.label}</h3>
        <div className="mt-4">{active.detail}</div>
      </div>
    </div>
  );
};

export default MethodPipeline;

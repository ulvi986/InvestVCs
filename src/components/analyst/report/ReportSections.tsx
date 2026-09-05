// The rest of the memo, drawn rather than recited.
//
// Scenarios get their probabilities as widths, methodology selection gets a
// grid you can scan for what ran and what refused, disagreements get both
// numbers side by side, and the open questions get put in the founder's own
// terms. Everything here has a data shape that reads better as a picture than
// as a paragraph — the paragraphs stay for the parts that don't.

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, CircleDashed, MinusCircle } from "lucide-react";

import type {
  Critique, Disagreement, GapItem, InvestmentThesis, Scenario,
} from "@/lib/analyst/types";
import { formatUsd } from "../primitives";

/* ── Scenarios ────────────────────────────────────────────────────────── */

const TONE = {
  bear: "var(--negative)",
  base: "var(--accent-ink)",
  bull: "var(--positive)",
} as const;

export const ScenarioBand = ({
  bear, base, bull,
}: {
  bear: Scenario;
  base: Scenario;
  bull: Scenario;
}) => {
  const cases = [
    { key: "bear" as const, scenario: bear },
    { key: "base" as const, scenario: base },
    { key: "bull" as const, scenario: bull },
  ];
  const total = cases.reduce((sum, entry) => sum + (entry.scenario?.probability ?? 0), 0) || 1;

  return (
    <div>
      {/* Probability as width: the base case usually owns the band, and when
          it does not, that is the finding. */}
      <div className="flex h-[10px] w-full overflow-hidden">
        {cases.map((entry, index) => (
          <div
            key={entry.key}
            style={{
              width: `${((entry.scenario?.probability ?? 0) / total) * 100}%`,
              background: TONE[entry.key],
              marginLeft: index ? 2 : 0,
            }}
            aria-hidden
          />
        ))}
      </div>

      <div className="mt-6 grid gap-8 sm:grid-cols-3">
        {cases.map((entry) => {
          const scenario = entry.scenario;
          if (!scenario) return null;
          return (
            <div key={entry.key}>
              <p className="kicker" style={{ color: TONE[entry.key] }}>
                {scenario.label} · {Math.round((scenario.probability ?? 0) * 100)}%
              </p>
              <p className="mt-2 text-[20px] font-medium leading-none tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">
                {scenario.valuationUsd !== null && scenario.valuationUsd !== undefined
                  ? formatUsd(scenario.valuationUsd)
                  : "—"}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-2)]">{scenario.narrative}</p>
              {scenario.drivers?.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {scenario.drivers.map((driver, index) => (
                    <li
                      key={`${driver}-${index}`}
                      className="flex gap-2 text-[12px] leading-relaxed text-[var(--ink-3)]"
                    >
                      <span aria-hidden>·</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Which methodologies ran, and why ─────────────────────────────────── */

export const MethodologyMap = ({
  entries,
}: {
  entries: InvestmentThesis["methodologySelectionExplanation"];
}) => {
  const [open, setOpen] = useState<string | null>(null);
  if (!entries?.length) return null;

  const used = entries.filter((entry) => entry.used);
  const declined = entries.filter((entry) => !entry.used);

  const Card = ({ entry }: { entry: (typeof entries)[number] }) => {
    const expanded = open === entry.methodologyId;
    return (
      <li className="border-b border-[var(--rule)] last:border-b-0">
        <button
          type="button"
          onClick={() => setOpen(expanded ? null : entry.methodologyId)}
          aria-expanded={expanded}
          className="flex w-full items-start gap-3 py-3.5 text-left"
        >
          {entry.used ? (
            <Check className="mt-[3px] h-3.5 w-3.5 shrink-0" style={{ color: "var(--positive)" }} aria-hidden />
          ) : (
            <MinusCircle className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] text-[var(--ink-1)]">{entry.name}</span>
            {!expanded && (
              <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-[var(--ink-3)]">
                {entry.reason}
              </span>
            )}
          </span>
          <ChevronDown
            className={`mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)] transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {expanded && (
          <p className="enter-up measure pb-4 pl-7 text-[12.5px] leading-[1.75] text-[var(--ink-2)]">
            {entry.reason}
          </p>
        )}
      </li>
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <p className="kicker">Ran ({used.length})</p>
        <ul className="mt-3">
          {used.map((entry) => (
            <Card key={entry.methodologyId} entry={entry} />
          ))}
        </ul>
      </div>
      <div>
        <p className="kicker">Declined ({declined.length})</p>
        <ul className="mt-3">
          {declined.map((entry) => (
            <Card key={entry.methodologyId} entry={entry} />
          ))}
        </ul>
      </div>
    </div>
  );
};

/* ── Where the methods disagree ───────────────────────────────────────── */

export const Disagreements = ({ items }: { items: Disagreement[] }) => {
  if (!items?.length) {
    return (
      <p className="max-w-[62ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
        The methodologies that ran did not materially disagree.
      </p>
    );
  }

  return (
    <ul className="space-y-8">
      {items.map((item) => {
        const max = Math.max(...item.values.map((value) => value.value), 1);
        // A disagreement may compare unlike things — a 0-10 score against a
        // dollar valuation. Bars on one axis would be nonsense there, so they
        // are only drawn when every value is the same kind of quantity.
        const money = item.values.map((value) => value.value >= 10_000);
        const comparable = money.every(Boolean) || money.every((entry) => !entry);
        const show = (value: number) =>
          value >= 10_000 ? formatUsd(value) : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
        return (
          <li key={item.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-[13.5px] text-[var(--ink-1)]">{item.topic}</span>
              <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
                {item.spreadRatio.toFixed(1)}× apart · {item.severity}
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {item.values.map((value) => (
                <div key={value.methodologyId} className="flex items-center gap-4">
                  <span className="w-52 shrink-0 truncate text-[12.5px] text-[var(--ink-2)]" title={value.label}>
                    {value.label}
                  </span>
                  {comparable && (
                    <span className="relative h-[10px] min-w-0 flex-1">
                      <span
                        className="absolute top-0 h-[10px] rounded-r-[3px]"
                        style={{
                          width: `${(value.value / max) * 100}%`,
                          background:
                            value.methodologyId === item.moreCredible ? "var(--accent-ink)" : "var(--rule-strong)",
                        }}
                        aria-hidden
                      />
                    </span>
                  )}
                  <span
                    className={`shrink-0 text-right text-[12.5px] tabular-nums text-[var(--ink-1)] ${comparable ? "w-24" : "flex-1"}`}
                  >
                    {show(value.value)}
                  </span>
                </div>
              ))}
            </div>

            <p className="measure mt-4 text-[12.5px] leading-relaxed text-[var(--ink-2)]">{item.explanation}</p>
            {item.rootCause && (
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-3)]">Root cause: {item.rootCause}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/* ── What the analysis could not establish ────────────────────────────── */

export const OpenQuestions = ({ gaps }: { gaps: GapItem[] }) => {
  if (!gaps?.length) {
    return (
      <p className="max-w-[62ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
        The analysis did not flag anything further it needs.
      </p>
    );
  }

  return (
    <ul className="space-y-0">
      {gaps.map((gap, index) => (
        <li key={`${gap.field}-${index}`} className="flex items-start gap-4 border-b border-[var(--rule)] py-4 last:border-b-0">
          <CircleDashed className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-relaxed text-[var(--ink-1)]">{gap.question}</p>
            <p className="mt-1.5 max-w-[74ch] text-[12px] leading-relaxed text-[var(--ink-3)]">{gap.why}</p>
            {gap.blocks?.length > 0 && (
              <p className="mt-1.5 text-[11px] text-[var(--ink-3)]">Blocks: {gap.blocks.join(", ")}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

/* ── The critic's verdict ─────────────────────────────────────────────── */

export const CriticSummary = ({ critique }: { critique: Critique | null }) => {
  if (!critique) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <p className="measure text-[13.5px] leading-[1.75] text-[var(--ink-2)]">{critique.summary}</p>

        {critique.redFlags?.length > 0 && (
          <div className="mt-8">
            <p className="kicker">Red flags</p>
            <ul className="mt-3 space-y-3">
              {critique.redFlags.map((flag, index) => (
                <li key={`${flag.title}-${index}`} className="flex gap-3">
                  <AlertTriangle
                    className="mt-[3px] h-3.5 w-3.5 shrink-0"
                    style={{ color: flag.severity === "critical" ? "var(--negative)" : "var(--caution)" }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-[var(--ink-1)]">{flag.title}</span>
                    <span className="mt-1 block max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                      {flag.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {critique.unsupportedAssumptions?.length > 0 && (
          <div className="mt-8">
            <p className="kicker">Claims the critic would not let stand</p>
            <ul className="mt-3 space-y-3">
              {critique.unsupportedAssumptions.map((item, index) => (
                <li key={`${item.claim}-${index}`} className="border-l border-[var(--rule)] pl-4">
                  <p className="text-[12.5px] leading-relaxed text-[var(--ink-1)]">{item.claim}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-3)]">{item.why}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="lg:border-l lg:border-[var(--rule)] lg:pl-8">
        <p className="kicker">Verdict</p>
        <p className="mt-3 text-[19px] font-medium tracking-[-0.02em] text-[var(--ink-1)]">
          {critique.verdict === "pass" ? "Passed" : critique.verdict === "revise" ? "Sent back to revise" : "Insufficient data"}
        </p>
        <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
          The critic capped confidence at {Math.round((critique.confidenceCeiling ?? 0) * 100)}%. Nothing downstream
          is allowed to report more than that, however sure it sounds.
        </p>

        {critique.contradictions?.length > 0 && (
          <>
            <p className="kicker mt-7">Contradictions found</p>
            <ul className="mt-3 space-y-3">
              {critique.contradictions.map((item, index) => (
                <li key={index} className="text-[12px] leading-relaxed text-[var(--ink-3)]">
                  {item.why}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Confidence, stated plainly ───────────────────────────────────────── */

export const ConfidencePanel = ({ thesis }: { thesis: InvestmentThesis }) => (
  <div className="grid gap-10 sm:grid-cols-2">
    <div>
      <p className="kicker">What supports the conclusion</p>
      <ul className="mt-3 space-y-2">
        {(thesis.confidence.drivers ?? []).map((driver, index) => (
          <li key={index} className="flex gap-2 text-[13px] leading-relaxed text-[var(--ink-2)]">
            <Check className="mt-[3px] h-3.5 w-3.5 shrink-0" style={{ color: "var(--positive)" }} aria-hidden />
            <span>{driver}</span>
          </li>
        ))}
      </ul>
    </div>
    <div>
      <p className="kicker">What limits it</p>
      <ul className="mt-3 space-y-2">
        {(thesis.confidence.caveats ?? []).map((caveat, index) => (
          <li key={index} className="flex gap-2 text-[13px] leading-relaxed text-[var(--ink-3)]">
            <AlertTriangle
              className="mt-[3px] h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--caution)" }}
              aria-hidden
            />
            <span>{caveat}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

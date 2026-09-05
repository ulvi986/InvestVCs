// Where the number came from.
//
// Every methodology that produced a figure, on one scale, with its own
// uncertainty band behind it and the weight it earned in the reconciliation.
// The reconciled band sits underneath on the same axis, so it reads as a
// product of the rows above rather than as a separate opinion — and where the
// methods disagree, the disagreement is the most visible thing here.

import { useState } from "react";
import { MinusCircle } from "lucide-react";

import type { InvestmentThesis, ReconciledValuation } from "@/lib/analyst/types";
import { formatUsd } from "../primitives";

export const ValuationBridge = ({
  thesis, reconciled,
}: {
  thesis: InvestmentThesis;
  reconciled: ReconciledValuation | null;
}) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const computed = thesis.valuation.perMethodology
    .filter((entry) => entry.range && entry.range.point > 0)
    .sort((a, b) => (b.range!.point ?? 0) - (a.range!.point ?? 0));

  const declined = thesis.valuation.perMethodology.filter((entry) => !entry.range);
  const excluded = reconciled?.excluded ?? [];
  const range = reconciled?.range ?? null;

  if (!computed.length) {
    return (
      <div>
        <p className="measure text-[13.5px] leading-relaxed text-[var(--ink-2)]">
          No methodology produced a defensible figure for this company. That is a finding, not a gap in the
          software: each one below says what it would need.
        </p>
        <div className="mt-5 space-y-3">
          {excluded.map((entry) => (
            <Declined key={entry.methodologyId} name={entry.methodologyId} reason={entry.reason} />
          ))}
        </div>
      </div>
    );
  }

  const max = Math.max(
    ...computed.map((entry) => entry.range!.high || entry.range!.point),
    range?.high ?? 0,
  );
  const weightOf = (id: string) =>
    reconciled?.weights.find((weight) => weight.methodologyId === id)?.weight ?? 0;
  const rationaleOf = (id: string) =>
    reconciled?.weights.find((weight) => weight.methodologyId === id)?.rationale ?? "";

  return (
    <div>
      <ul>
        {computed.map((entry) => {
          const active = hovered === entry.methodologyId;
          const value = entry.range!;
          return (
            <li key={entry.methodologyId} className="border-b border-[var(--rule)] last:border-b-0">
              <div
                onMouseEnter={() => setHovered(entry.methodologyId)}
                onMouseLeave={() => setHovered(null)}
                className="py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <span className="text-[13.5px] text-[var(--ink-1)]">{entry.name}</span>
                  <span className="flex items-baseline gap-4">
                    <span className="text-[11px] tabular-nums text-[var(--ink-3)]">
                      {Math.round(entry.confidence * 100)}% conf.
                    </span>
                    {weightOf(entry.methodologyId) > 0 && (
                      <span className="text-[11px] tabular-nums text-[var(--ink-3)]">
                        {Math.round(weightOf(entry.methodologyId) * 100)}% weight
                      </span>
                    )}
                    <span className="text-[15px] font-medium tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">
                      {formatUsd(value.point)}
                    </span>
                  </span>
                </div>

                <div className="relative mt-3 h-[14px]">
                  <div
                    className="absolute top-[4px] h-[6px]"
                    style={{
                      left: `${(value.low / max) * 100}%`,
                      width: `${Math.max(0, (value.high - value.low) / max) * 100}%`,
                      background: "var(--accent-wash)",
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute top-0 h-[14px] rounded-r-[3px]"
                    style={{
                      width: `${(value.point / max) * 100}%`,
                      background: active ? "var(--ink-1)" : "var(--accent-ink)",
                      transition: "background var(--dur-fast) var(--ease-out)",
                    }}
                    aria-hidden
                  />
                </div>

                <p className="mt-2.5 max-w-[74ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                  {formatUsd(value.low)} – {formatUsd(value.high)}
                  {rationaleOf(entry.methodologyId) && ` · ${rationaleOf(entry.methodologyId)}`}
                </p>
              </div>
            </li>
          );
        })}

        {range && range.point > 0 && (
          <li className="border-t-2 border-[var(--ink-1)] pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-[13.5px] font-medium text-[var(--ink-1)]">Reconciled</span>
              <span className="text-[15px] font-medium tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">
                {formatUsd(range.point)}
              </span>
            </div>
            <div className="relative mt-3 h-[14px]">
              <div
                className="absolute top-[4px] h-[6px]"
                style={{
                  left: `${(range.low / max) * 100}%`,
                  width: `${Math.max(0, (range.high - range.low) / max) * 100}%`,
                  background: "var(--band)",
                }}
                aria-hidden
              />
              <div
                className="absolute top-0 h-[14px] rounded-r-[3px]"
                style={{ width: `${(range.point / max) * 100}%`, background: "var(--ink-1)" }}
                aria-hidden
              />
            </div>
            {reconciled && (
              <p className="mt-2.5 max-w-[74ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                {reconciled.method} · spread {reconciled.spreadRatio.toFixed(1)}×, agreement{" "}
                {Math.round(reconciled.agreement * 100)}%.
              </p>
            )}
          </li>
        )}
      </ul>

      {reconciled?.explanation && (
        <p className="measure mt-8 text-[13px] leading-[1.75] text-[var(--ink-2)]">{reconciled.explanation}</p>
      )}

      {reconciled?.keyAssumptions?.length > 0 && (
        <div className="mt-8">
          <p className="kicker">The assumptions this rests on</p>
          <ul className="mt-3 space-y-2">
            {reconciled!.keyAssumptions.map((assumption) => (
              <li key={assumption} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                <span aria-hidden className="text-[var(--ink-3)]">·</span>
                <span>{assumption}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(declined.length > 0 || excluded.length > 0) && (
        <div className="mt-8">
          <p className="kicker">Did not produce a figure</p>
          <div className="mt-3 space-y-3">
            {declined.map((entry) => (
              <Declined
                key={entry.methodologyId}
                name={entry.name}
                reason={
                  excluded.find((item) => item.methodologyId === entry.methodologyId)?.reason ??
                  "The agent declined to run it on this material."
                }
              />
            ))}
            {/* Exclusions the reconciler recorded that never reached
                perMethodology at all. Without this they were a heading with
                nothing under it. */}
            {excluded
              .filter((item) => !declined.some((entry) => entry.methodologyId === item.methodologyId))
              .map((item) => (
                <Declined key={item.methodologyId} name={item.methodologyId} reason={item.reason} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Declined = ({ name, reason }: { name: string; reason: string }) => (
  <div className="flex items-start gap-3">
    <MinusCircle className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden />
    <p className="max-w-[76ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
      <span className="text-[var(--ink-2)]">{name}</span> — {reason}
    </p>
  </div>
);

export default ValuationBridge;

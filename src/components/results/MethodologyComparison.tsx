// What each methodology said, side by side.
//
// Ranked by value, with each method's own uncertainty band drawn behind its
// bar and its blend weight stated. The methods that did not run are listed
// underneath with the reason — a method that was excluded is a finding, not
// an omission.

import { useState } from "react";
import { MinusCircle } from "lucide-react";

import { formatUsd } from "@/components/analyst/primitives";
import type { AssessmentResult, MethodologyOutcome } from "@/lib/assessment";

interface MethodologyComparisonProps {
  result: AssessmentResult;
  onSelect?: (methodologyId: string) => void;
}

export const MethodologyComparison = ({ result, onSelect }: MethodologyComparisonProps) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const computed = result.methodologies
    .filter((m): m is MethodologyOutcome & { range: NonNullable<MethodologyOutcome["range"]> } =>
      m.status === "computed" && Boolean(m.range))
    .sort((a, b) => b.range.point - a.range.point);

  const skipped = result.methodologies.filter((m) => m.status !== "computed");

  if (!computed.length) {
    return (
      <div className="space-y-3">
        {skipped.map((methodology) => (
          <SkippedRow key={methodology.id} methodology={methodology} />
        ))}
      </div>
    );
  }

  const max = Math.max(
    ...computed.map((m) => m.range.high),
    result.valuation.high,
  );
  const weightOf = (id: string) => result.blend.weights.find((w) => w.methodologyId === id)?.weight ?? 0;

  return (
    <div>
      <ul className="space-y-0">
        {computed.map((methodology) => {
          const active = hovered === methodology.id;
          return (
            <li key={methodology.id} className="border-b border-[var(--rule)] last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect?.(methodology.id)}
                onMouseEnter={() => setHovered(methodology.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(methodology.id)}
                onBlur={() => setHovered(null)}
                className="w-full py-4 text-left"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <span className="text-[13.5px] text-[var(--ink-1)]">{methodology.name}</span>
                  <span className="flex items-baseline gap-4">
                    <span className="text-[11px] tabular-nums text-[var(--ink-3)]">
                      {Math.round(weightOf(methodology.id) * 100)}% weight
                    </span>
                    <span className="text-[15px] font-medium tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">
                      {formatUsd(methodology.range.point)}
                    </span>
                  </span>
                </div>

                {/* Bar with its own uncertainty band behind it. */}
                <div className="relative mt-3 h-[14px]">
                  <div
                    className="absolute top-[4px] h-[6px]"
                    style={{
                      left: `${(methodology.range.low / max) * 100}%`,
                      width: `${((methodology.range.high - methodology.range.low) / max) * 100}%`,
                      background: "var(--accent-wash)",
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute top-0 h-[14px] rounded-r-[3px]"
                    style={{
                      width: `${(methodology.range.point / max) * 100}%`,
                      background: active ? "var(--ink-1)" : "var(--accent-ink)",
                      transition: "background var(--dur-fast) var(--ease-out)",
                    }}
                    aria-hidden
                  />
                </div>

                <p className="mt-2.5 max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                  {methodology.headline}{" "}
                  <span className="text-[var(--ink-3)]">
                    Range {formatUsd(methodology.range.low)}–{formatUsd(methodology.range.high)} at{" "}
                    {Math.round(methodology.confidence * 100)}% confidence.
                  </span>
                </p>
              </button>
            </li>
          );
        })}

        {/* The blend, on the same scale, so it is visibly a product of the
            rows above rather than a separate opinion. */}
        <li className="border-t-2 border-[var(--ink-1)] pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="text-[13.5px] font-medium text-[var(--ink-1)]">Blended estimate</span>
            <span className="text-[15px] font-medium tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">
              {formatUsd(result.valuation.point)}
            </span>
          </div>
          <div className="relative mt-3 h-[14px]">
            <div
              className="absolute top-[4px] h-[6px]"
              style={{
                left: `${(result.valuation.low / max) * 100}%`,
                width: `${((result.valuation.high - result.valuation.low) / max) * 100}%`,
                background: "var(--band)",
              }}
              aria-hidden
            />
            <div
              className="absolute top-0 h-[14px] rounded-r-[3px]"
              style={{ width: `${(result.valuation.point / max) * 100}%`, background: "var(--ink-1)" }}
              aria-hidden
            />
          </div>
          <p className="mt-2.5 max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
            Weighted by each method's confidence, then widened for disagreement. Methods agree{" "}
            {Math.round(result.blend.agreement * 100)}%.
          </p>
        </li>
      </ul>

      {skipped.length > 0 && (
        <div className="mt-8">
          <p className="kicker">Not run ({skipped.length})</p>
          <div className="mt-3 space-y-3">
            {skipped.map((methodology) => (
              <SkippedRow key={methodology.id} methodology={methodology} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SkippedRow = ({ methodology }: { methodology: MethodologyOutcome }) => (
  <div className="flex items-start gap-3">
    <MinusCircle className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden />
    <p className="max-w-[74ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
      <span className="text-[var(--ink-2)]">{methodology.name}</span> — {methodology.reason}
    </p>
  </div>
);

export default MethodologyComparison;

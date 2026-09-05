// The range, drawn as a range.
//
// A single number would be the most confident thing on the page and the least
// defensible. This draws the band, marks the base case inside it, and shows
// where each individual methodology landed underneath — so a wide band is
// visibly the product of methods disagreeing, not a decorative choice.

import { useState } from "react";

import { formatUsd } from "@/components/analyst/primitives";
import type { AssessmentResult } from "@/lib/assessment";

interface ValuationRangeProps {
  result: AssessmentResult;
}

export const ValuationRange = ({ result }: ValuationRangeProps) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const { valuation, scenarios, methodologies } = result;

  const computed = methodologies.filter((m) => m.status === "computed" && m.range);
  if (valuation.point <= 0) {
    return (
      <p className="max-w-[60ch] text-[13.5px] leading-relaxed text-[var(--ink-3)]">
        No methodology has run yet. Answer more of the interview and the range will appear here.
      </p>
    );
  }

  // The axis is padded past the band so the endpoints are not stuck to the
  // frame, and so an outlying method is still visible.
  const points = [
    valuation.low,
    valuation.high,
    ...computed.map((m) => m.range!.point),
  ];
  const min = Math.min(...points) * 0.9;
  const max = Math.max(...points) * 1.06;
  const at = (value: number) => ((value - min) / (max - min)) * 100;

  return (
    <div>
      {/* Scenario figures, direct-labelled above the band they describe. */}
      <div className="grid grid-cols-3 gap-4">
        {scenarios.map((scenario) => (
          <div key={scenario.key} className={scenario.key === "base" ? "text-center" : scenario.key === "bull" ? "text-right" : ""}>
            <p className="kicker">{scenario.label}</p>
            <p className="mt-2 text-[19px] font-medium leading-none tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">
              {formatUsd(scenario.valuation)}
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-6 h-16">
        {/* Track */}
        <div className="absolute left-0 right-0 top-[18px] h-[2px] bg-[var(--rule)]" aria-hidden />

        {/* The band */}
        <div
          className="absolute top-[13px] h-[12px]"
          style={{
            left: `${at(valuation.low)}%`,
            width: `${at(valuation.high) - at(valuation.low)}%`,
            background: "var(--accent-wash)",
            borderTop: "2px solid var(--accent-ink)",
            borderBottom: "2px solid var(--accent-ink)",
          }}
          aria-hidden
        />

        {/* Endpoints and base case */}
        {[
          { value: valuation.low, strong: false },
          { value: valuation.point, strong: true },
          { value: valuation.high, strong: false },
        ].map((mark, index) => (
          <div
            key={index}
            className="absolute top-[8px]"
            style={{
              left: `${at(mark.value)}%`,
              width: mark.strong ? 3 : 2,
              height: mark.strong ? 22 : 16,
              marginLeft: mark.strong ? -1.5 : -1,
              background: "var(--accent-ink)",
              opacity: mark.strong ? 1 : 0.55,
            }}
            aria-hidden
          />
        ))}

        {/* Where each methodology landed. Two-pixel surface ring keeps
            overlapping ticks legible. */}
        {computed.map((methodology) => (
          <button
            key={methodology.id}
            type="button"
            onMouseEnter={() => setHovered(methodology.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(methodology.id)}
            onBlur={() => setHovered(null)}
            aria-label={`${methodology.name}: ${formatUsd(methodology.range!.point)}`}
            className="absolute top-[38px] h-4 w-4 -translate-x-1/2 cursor-default"
            style={{ left: `${at(methodology.range!.point)}%` }}
          >
            <span
              className="block h-[9px] w-[9px] translate-x-[3px] rotate-45"
              style={{
                background: hovered === methodology.id ? "var(--ink-1)" : "var(--ink-3)",
                boxShadow: "0 0 0 2px var(--page)",
              }}
            />
          </button>
        ))}

        {hovered && (
          <div
            className="pointer-events-none absolute top-[56px] z-10 -translate-x-1/2 whitespace-nowrap border border-[var(--rule-strong)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--ink-1)] shadow-[var(--shadow-md)]"
            style={{ left: `${at(computed.find((m) => m.id === hovered)!.range!.point)}%` }}
            role="status"
          >
            {computed.find((m) => m.id === hovered)!.name} ·{" "}
            <span className="tabular-nums">{formatUsd(computed.find((m) => m.id === hovered)!.range!.point)}</span>
          </div>
        )}
      </div>

      <p className="mt-6 text-[12px] text-[var(--ink-3)]">
        Diamonds mark where each methodology landed. The band is their confidence-weighted blend, widened by how
        much they disagree — currently {result.blend.spread.toFixed(1)}× between the highest and lowest.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {scenarios.map((scenario) => (
          <div key={scenario.key} className="border-t border-[var(--rule)] pt-4">
            <p className="kicker">{scenario.label} case</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">{scenario.narrative}</p>
            <ul className="mt-3 space-y-1.5">
              {scenario.assumptions.map((assumption) => (
                <li key={assumption} className="flex gap-2 text-[12px] leading-relaxed text-[var(--ink-3)]">
                  <span aria-hidden>·</span>
                  <span>{assumption}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValuationRange;

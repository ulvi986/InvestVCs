// The four figures that answer "so what".
//
// Score, valuation, confidence, risk — and each one carries the caveat that
// belongs to it, in the same eyeline. A score of 85 next to a confidence of
// 31% is a different statement from a score of 85 next to 80%, and the layout
// refuses to let the reader see one without the other.

import { AlertTriangle } from "lucide-react";

import { confidenceLabel, formatUsd } from "@/components/analyst/primitives";
import type { AssessmentResult } from "@/lib/assessment";

const RISK_TONE: Record<AssessmentResult["riskLevel"], { label: string; color: string }> = {
  low: { label: "Low", color: "var(--positive)" },
  moderate: { label: "Moderate", color: "var(--accent-ink)" },
  elevated: { label: "Elevated", color: "var(--caution)" },
  high: { label: "High", color: "var(--negative)" },
};

const bandColor = (ratio: number): string =>
  ratio >= 0.7 ? "var(--positive)"
    : ratio >= 0.5 ? "var(--accent-ink)"
      : ratio >= 0.3 ? "var(--caution)"
        : "var(--negative)";

/** A single-value dial. One series, one hue — no legend needed. */
const Dial = ({ value, max = 100, label }: { value: number; max?: number; label: string }) => {
  const radius = 46;
  const stroke = 7;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, value / max));
  // Three-quarter sweep, opening at the bottom: the gap reads as a scale
  // rather than as a pie.
  const sweep = 0.75;

  return (
    <svg viewBox="0 0 120 120" className="h-[116px] w-[116px] -rotate-[225deg]" role="img" aria-label={`${label}: ${value} out of ${max}`}>
      <circle
        cx="60" cy="60" r={radius} fill="none"
        stroke="var(--rule)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circumference * sweep} ${circumference}`}
      />
      <circle
        cx="60" cy="60" r={radius} fill="none"
        stroke={bandColor(ratio)} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circumference * sweep * ratio} ${circumference}`}
        style={{ transition: "stroke-dasharray var(--dur-moderate) var(--ease-out)" }}
      />
    </svg>
  );
};

const Tile = ({
  label, children, note,
}: {
  label: string;
  children: React.ReactNode;
  note?: string;
}) => (
  <div className="border-t border-[var(--rule)] pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:first:border-l-0 sm:first:pl-0">
    <p className="kicker">{label}</p>
    <div className="mt-3">{children}</div>
    {note && <p className="mt-2 max-w-[26ch] text-[12px] leading-relaxed text-[var(--ink-3)]">{note}</p>}
  </div>
);

export const ScoreHero = ({ result, name }: { result: AssessmentResult; name: string }) => {
  const risk = RISK_TONE[result.riskLevel];
  const hasValuation = result.valuation.point > 0;

  return (
    <section>
      {result.provisional && (
        <div
          className="mb-8 flex items-start gap-3 border-l-2 bg-[var(--band)] p-4"
          style={{ borderColor: "var(--caution)" }}
          role="status"
        >
          <AlertTriangle className="mt-[2px] h-4 w-4 shrink-0" style={{ color: "var(--caution)" }} aria-hidden />
          <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            <strong className="font-medium text-[var(--ink-1)]">This valuation is provisional.</strong>{" "}
            Some answers contradict each other. The figures below are computed anyway, so you can see what is at
            stake, but they should not be quoted until the inconsistencies further down are settled.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
        <div className="flex shrink-0 items-center gap-6">
          <div className="relative">
            <Dial value={result.overallScore} label="Overall score" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[34px] font-medium leading-none tabular-nums tracking-[-0.03em] text-[var(--ink-1)]">
                {result.overallScore}
              </span>
              <span className="mt-1 text-[10.5px] text-[var(--ink-3)]">/ 100</span>
            </div>
          </div>
          <div>
            <p className="kicker">Overall score</p>
            <p className="mt-2 max-w-[22ch] text-[13px] leading-relaxed text-[var(--ink-2)]">
              {name ? `${name} scores` : "Scored"} {result.overallScore} after the evidence haircut, from a raw
              reading of {result.rawScore}.
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-6 sm:grid-cols-3 sm:gap-0">
          <Tile
            label="Estimated valuation"
            note={
              hasValuation
                ? `Blended across ${result.blend.weights.length} method${result.blend.weights.length === 1 ? "" : "s"}. A range, not a number — the evidence does not support more precision.`
                : "Not enough of the interview is complete to run the methodologies."
            }
          >
            {hasValuation ? (
              <p className="text-[26px] font-medium leading-none tabular-nums tracking-[-0.03em] text-[var(--ink-1)]">
                {formatUsd(result.valuation.low)} – {formatUsd(result.valuation.high)}
              </p>
            ) : (
              <p className="text-[20px] font-medium leading-none text-[var(--ink-3)]">Not yet</p>
            )}
          </Tile>

          <Tile
            label="Confidence"
            note={`${Math.round(result.evidenceQuality * 100)}% evidence quality across ${Math.round(result.coverage * 100)}% of the interview.`}
          >
            <p className="text-[26px] font-medium leading-none tabular-nums tracking-[-0.03em] text-[var(--ink-1)]">
              {Math.round(result.confidence * 100)}%
              <span className="ml-2 text-[13px] font-normal tracking-normal text-[var(--ink-3)]">
                {confidenceLabel(result.confidence)}
              </span>
            </p>
            <span className="analyst-bar mt-3 block">
              <span style={{ width: `${result.confidence * 100}%`, background: bandColor(result.confidence) }} />
            </span>
          </Tile>

          <Tile
            label="Risk level"
            note={`${result.risks.filter((r) => r.severity === "high").length} high-severity flag${result.risks.filter((r) => r.severity === "high").length === 1 ? "" : "s"} raised by your answers.`}
          >
            <p className="flex items-baseline gap-2.5 text-[26px] font-medium leading-none tracking-[-0.03em] text-[var(--ink-1)]">
              <span className="h-2 w-2 shrink-0 -translate-y-[3px] rounded-full" style={{ background: risk.color }} aria-hidden />
              {risk.label}
            </p>
          </Tile>
        </div>
      </div>
    </section>
  );
};

export default ScoreHero;

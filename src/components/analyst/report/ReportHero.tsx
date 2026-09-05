// The top of the memo: the verdict, the number, and what the number is worth.
//
// The panel version of this report has to say all of this in a 470px column,
// so it says it in prose. Given the width of a page, the same four facts can
// be read at a glance — and, more importantly, read *together*: a Consider at
// 36% confidence is a different statement from a Consider at 80%.

import type { InvestmentThesis, ReconciledValuation } from "@/lib/analyst/types";
import { RECOMMENDATION_LABEL, confidenceLabel, formatUsd } from "../primitives";

const RECOMMENDATION_TONE: Record<string, string> = {
  strong_invest: "var(--positive)",
  invest: "var(--positive)",
  consider: "var(--accent-ink)",
  watch: "var(--caution)",
  pass: "var(--negative)",
};

const band = (value: number): string =>
  value >= 0.7 ? "var(--positive)"
    : value >= 0.45 ? "var(--accent-ink)"
      : value >= 0.25 ? "var(--caution)"
        : "var(--negative)";

/** Three-quarter sweep dial. One value, one hue, no legend needed. */
const Dial = ({ value, label }: { value: number; label: string }) => {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const sweep = 0.75;
  const ratio = Math.min(1, Math.max(0, value));

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-[112px] w-[112px] -rotate-[225deg]"
      role="img"
      aria-label={`${label}: ${Math.round(ratio * 100)} per cent`}
    >
      <circle
        cx="60" cy="60" r={radius} fill="none" stroke="var(--rule)" strokeWidth={7}
        strokeLinecap="round" strokeDasharray={`${circumference * sweep} ${circumference}`}
      />
      <circle
        cx="60" cy="60" r={radius} fill="none" stroke={band(ratio)} strokeWidth={7}
        strokeLinecap="round" strokeDasharray={`${circumference * sweep * ratio} ${circumference}`}
        style={{ transition: "stroke-dasharray var(--dur-moderate) var(--ease-out)" }}
      />
    </svg>
  );
};

const Tile = ({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) => (
  <div className="border-t border-[var(--rule)] pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:first:border-l-0 sm:first:pl-0">
    <p className="kicker">{label}</p>
    <div className="mt-3">{children}</div>
    {note && <p className="mt-2 max-w-[28ch] text-[12px] leading-relaxed text-[var(--ink-3)]">{note}</p>}
  </div>
);

export const ReportHero = ({
  thesis, reconciled, startupName,
}: {
  thesis: InvestmentThesis;
  reconciled: ReconciledValuation | null;
  startupName: string;
}) => {
  const range = reconciled?.range ?? thesis.valuation.reconciled?.range ?? null;
  const confidence = thesis.confidence.overall ?? 0;
  const tone = RECOMMENDATION_TONE[thesis.recommendation] ?? "var(--accent-ink)";
  const ran = thesis.valuation.perMethodology.filter((entry) => entry.range).length;

  return (
    <section>
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
        <div className="flex shrink-0 items-center gap-6">
          <div className="relative">
            <Dial value={confidence} label="Overall confidence" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[30px] font-medium leading-none tabular-nums tracking-[-0.03em] text-[var(--ink-1)]">
                {Math.round(confidence * 100)}
                <span className="text-[15px]">%</span>
              </span>
              <span className="mt-1 text-[10.5px] text-[var(--ink-3)]">confidence</span>
            </div>
          </div>

          <div>
            <p className="kicker">Recommendation</p>
            <p
              className="mt-2 flex items-baseline gap-2.5 text-[30px] font-medium leading-none tracking-[-0.03em] text-[var(--ink-1)]"
            >
              <span className="h-2.5 w-2.5 shrink-0 -translate-y-[3px] rounded-full" style={{ background: tone }} aria-hidden />
              {RECOMMENDATION_LABEL[thesis.recommendation] ?? thesis.recommendation}
            </p>
            <p className="mt-2 max-w-[24ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
              {confidenceLabel(confidence)} confidence, from {ran} valuation
              {ran === 1 ? " methodology" : " methodologies"} that produced a figure.
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-6 sm:grid-cols-3 sm:gap-0">
          <Tile
            label="Reconciled valuation"
            note={
              reconciled
                ? `Methods spread ${reconciled.spreadRatio.toFixed(1)}× apart; they agree ${Math.round(reconciled.agreement * 100)}%.`
                : "No methodology produced a defensible figure."
            }
          >
            {range && range.point > 0 ? (
              <p className="text-[25px] font-medium leading-none tabular-nums tracking-[-0.03em] text-[var(--ink-1)]">
                {formatUsd(range.low)} – {formatUsd(range.high)}
              </p>
            ) : (
              <p className="text-[19px] font-medium leading-none text-[var(--ink-3)]">No valuation</p>
            )}
          </Tile>

          <Tile
            label="Evidence quality"
            note={`${Math.round((thesis.confidence.coverage ?? 0) * 100)}% of the planned methodologies completed.`}
          >
            <p className="text-[25px] font-medium leading-none tabular-nums tracking-[-0.03em] text-[var(--ink-1)]">
              {Math.round((thesis.confidence.evidenceQuality ?? 0) * 100)}%
            </p>
            <span className="analyst-bar mt-3 block">
              <span
                style={{
                  width: `${(thesis.confidence.evidenceQuality ?? 0) * 100}%`,
                  background: band(thesis.confidence.evidenceQuality ?? 0),
                }}
              />
            </span>
          </Tile>

          <Tile
            label="Open risks"
            note={`${thesis.missingInformation.length} question${thesis.missingInformation.length === 1 ? "" : "s"} the founder still owes an answer on.`}
          >
            <p className="flex items-baseline gap-2 text-[25px] font-medium leading-none tabular-nums tracking-[-0.03em] text-[var(--ink-1)]">
              {thesis.risks.filter((risk) => risk.severity === "critical" || risk.severity === "high").length}
              <span className="text-[13px] font-normal tracking-normal text-[var(--ink-3)]">
                of {thesis.risks.length} serious
              </span>
            </p>
          </Tile>
        </div>
      </div>

      <p className="measure mt-10 text-[15px] leading-[1.75] text-[var(--ink-1)]">
        {thesis.executiveSummary}
      </p>
      <p className="mt-3 text-[12px] text-[var(--ink-3)]">
        {startupName} · analytical estimate from the material supplied, not a market price.
      </p>
    </section>
  );
};

export default ReportHero;

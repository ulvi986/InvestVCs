// Valuation reconciliation.
//
// The chart is the argument: each methodology's range is drawn on one shared
// scale so the reader sees the disagreement before they see the number. The
// reconciled band sits behind them, and every weight, exclusion and outlier is
// named rather than quietly folded into an average.

import { useMemo } from "react";
import type { Disagreement, MethodologyResult, ReconciledValuation } from "@/lib/analyst/types";
import { getMethodology } from "@/lib/analyst/registry";
import {
  ConfidenceMeter, Empty, Eyebrow, Figure, Panel, SeverityTag, Tag, formatUsd,
} from "./primitives";

interface Band {
  id: string;
  name: string;
  low: number;
  point: number;
  high: number;
  confidence: number;
  excluded?: string;
}

const nameOf = (id: string) => getMethodology(id)?.name ?? id;

export const ValuationPanel = ({
  results, reconciled, disagreements,
}: {
  results: Record<string, MethodologyResult>;
  reconciled: ReconciledValuation | null;
  disagreements: Disagreement[];
}) => {
  const excludedById = useMemo(
    () => new Map((reconciled?.excluded ?? []).map((item) => [item.methodologyId, item.reason])),
    [reconciled],
  );

  const bands = useMemo<Band[]>(
    () =>
      Object.values(results)
        .filter((result) => getMethodology(result.methodologyId)?.family === "valuation")
        .filter((result) => result.valuation && result.valuation.point > 0)
        .map((result) => ({
          id: result.methodologyId,
          name: result.name,
          low: result.valuation!.low,
          point: result.valuation!.point,
          high: result.valuation!.high,
          confidence: result.confidence,
          excluded: excludedById.get(result.methodologyId),
        }))
        .sort((a, b) => a.point - b.point),
    [results, excludedById],
  );

  const insufficient = Object.values(results).filter(
    (result) =>
      getMethodology(result.methodologyId)?.family === "valuation" &&
      result.status !== "completed",
  );

  const scale = useMemo(() => {
    const values = [
      ...bands.flatMap((band) => [band.low, band.high]),
      ...(reconciled && reconciled.range.point > 0 ? [reconciled.range.low, reconciled.range.high] : []),
    ].filter((value) => isFinite(value));
    if (!values.length) return null;
    const min = Math.min(...values, 0);
    const max = Math.max(...values);
    const span = max - min || 1;
    // A little headroom either side so end labels are not clipped.
    return { min: min - span * 0.05, max: max + span * 0.05, span: span * 1.1 };
  }, [bands, reconciled]);

  const pos = (value: number) => (scale ? ((value - scale.min) / scale.span) * 100 : 0);

  const valuationDisagreement = disagreements.find((item) => item.id === "valuation-spread");

  if (!bands.length && !insufficient.length) {
    return (
      <Panel title="Valuation">
        <Empty>No valuation methodology was applied to this startup.</Empty>
      </Panel>
    );
  }

  return (
    <Panel
      title="Valuation"
      subtitle={reconciled?.range.point ? reconciled.method : undefined}
      actions={
        reconciled && reconciled.range.point > 0 ? (
          <div className="text-right">
            <Figure className="block text-2xl font-medium text-foreground">
              {formatUsd(reconciled.range.point)}
            </Figure>
            <Figure className="text-xs text-muted-foreground">
              {formatUsd(reconciled.range.low)} – {formatUsd(reconciled.range.high)}
            </Figure>
          </div>
        ) : null
      }
    >
      {/* Shared-scale range chart */}
      {scale && bands.length > 0 && (
        <div className="relative mb-6 rounded-xl border border-[var(--rule)] bg-[var(--band)] px-4 py-5">
          {reconciled && reconciled.range.point > 0 && (
            <div
              className="pointer-events-none absolute inset-y-3 rounded-md border-x border-[color-mix(in_srgb,var(--accent-ink)_25%,transparent)] bg-[var(--accent-ink)]/[0.07]"
              style={{
                left: `${pos(reconciled.range.low)}%`,
                width: `${Math.max(0.5, pos(reconciled.range.high) - pos(reconciled.range.low))}%`,
              }}
              aria-hidden
            />
          )}

          <div className="relative space-y-3">
            {bands.map((band) => (
              <div key={band.id} className="flex items-center gap-3">
                <span
                  className={`w-36 shrink-0 truncate text-xs ${band.excluded ? "text-muted-foreground/50 line-through" : "text-muted-foreground"}`}
                  title={band.name}
                >
                  {band.name}
                </span>
                <div className="relative h-5 flex-1">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--band)]" />
                  <div
                    className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${
                      band.excluded ? "bg-[var(--band)]" : "bg-[color-mix(in_srgb,var(--accent-ink)_45%,transparent)]"
                    }`}
                    style={{
                      left: `${pos(band.low)}%`,
                      width: `${Math.max(0.6, pos(band.high) - pos(band.low))}%`,
                    }}
                  />
                  <div
                    className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${
                      band.excluded ? "bg-muted-foreground/50" : "bg-[var(--accent-ink)]"
                    }`}
                    style={{ left: `${pos(band.point)}%` }}
                    title={formatUsd(band.point)}
                  />
                </div>
                <Figure className="w-16 shrink-0 text-right text-xs text-foreground/80">
                  {formatUsd(band.point)}
                </Figure>
              </div>
            ))}
          </div>

          <div className="relative mt-4 flex justify-between border-t border-[var(--rule)] pt-2">
            <Figure className="text-[10px] text-muted-foreground/60">{formatUsd(scale.min)}</Figure>
            <Figure className="text-[10px] text-muted-foreground/60">{formatUsd(scale.max)}</Figure>
          </div>
        </div>
      )}

      {/* Agreement */}
      {reconciled && bands.length > 1 && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div>
            <Eyebrow>Spread</Eyebrow>
            <Figure className="mt-1 block text-lg text-foreground">
              {isFinite(reconciled.spreadRatio) ? `${reconciled.spreadRatio.toFixed(2)}×` : "—"}
            </Figure>
            <p className="mt-0.5 text-xs text-muted-foreground">highest ÷ lowest estimate</p>
          </div>
          <div>
            <Eyebrow>Agreement</Eyebrow>
            <Figure className="mt-1 block text-lg text-foreground">{(reconciled.agreement * 100).toFixed(0)}%</Figure>
            <p className="mt-0.5 text-xs text-muted-foreground">across methodologies</p>
          </div>
          <div>
            <ConfidenceMeter value={reconciled.confidence} label="Reconciliation confidence" />
          </div>
        </div>
      )}

      {/* Why they disagree — the critic's explanation, not an average */}
      {valuationDisagreement && (valuationDisagreement.rootCause || valuationDisagreement.explanation) && (
        <div className="mb-5 rounded-xl border-l-2 border-[var(--caution)] border-y border-r border-[var(--rule)] bg-[var(--band)] p-4">
          <div className="flex items-center gap-2">
            <Eyebrow>Why the methodologies disagree</Eyebrow>
            <SeverityTag severity={valuationDisagreement.severity} />
          </div>
          {valuationDisagreement.rootCause && (
            <p className="mt-2.5 text-sm leading-relaxed text-foreground/85">{valuationDisagreement.rootCause}</p>
          )}
          {valuationDisagreement.explanation && (
            <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
              {valuationDisagreement.explanation}
            </p>
          )}
          {valuationDisagreement.moreCredible && valuationDisagreement.moreCredible !== "unresolved" && (
            <p className="mt-2.5 text-xs text-muted-foreground">
              More credible here: <span className="text-foreground/80">{nameOf(valuationDisagreement.moreCredible)}</span>
            </p>
          )}
          {valuationDisagreement.missingInfo.length > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Would resolve it: {valuationDisagreement.missingInfo.join("; ")}
            </p>
          )}
        </div>
      )}

      {reconciled?.explanation && (
        <p className="mb-5 text-sm font-light leading-relaxed text-foreground/80">{reconciled.explanation}</p>
      )}

      {/* Weights */}
      {reconciled && reconciled.weights.length > 0 && (
        <div className="mb-5">
          <Eyebrow>How the range was weighted</Eyebrow>
          <ul className="mt-2.5 space-y-2">
            {reconciled.weights.map((weight) => (
              <li key={weight.methodologyId} className="flex items-start gap-3 text-sm">
                <Figure className="w-12 shrink-0 text-right font-medium text-foreground">
                  {(weight.weight * 100).toFixed(0)}%
                </Figure>
                <span className="w-36 shrink-0 truncate text-muted-foreground">{nameOf(weight.methodologyId)}</span>
                <span className="flex-1 text-xs font-light leading-relaxed text-muted-foreground">{weight.rationale}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reconciled && reconciled.excluded.length > 0 && (
        <div className="mb-5">
          <Eyebrow>Excluded from the point estimate</Eyebrow>
          <ul className="mt-2.5 space-y-1.5">
            {reconciled.excluded.map((item) => (
              <li key={item.methodologyId} className="text-sm text-muted-foreground">
                <span className="text-foreground/80">{nameOf(item.methodologyId)}</span> — {item.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insufficient.length > 0 && (
        <div className="mb-5">
          <Eyebrow>No valuation produced</Eyebrow>
          <ul className="mt-2.5 space-y-1.5">
            {insufficient.map((result) => (
              <li key={result.methodologyId} className="text-sm text-muted-foreground">
                <span className="text-foreground/80">{result.name}</span> —{" "}
                {result.error ?? (result.computed as any)?.platformNotes?.[0] ?? "required inputs were unavailable"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reconciled && reconciled.keyAssumptions.length > 0 && (
        <div>
          <Eyebrow>Key assumptions</Eyebrow>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {reconciled.keyAssumptions.map((assumption, i) => (
              <Tag key={i} tone="muted">{assumption}</Tag>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
};

export default ValuationPanel;

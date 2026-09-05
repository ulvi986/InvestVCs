// Risks, placed rather than listed.
//
// A run produces thirty to forty-five risks. As a list that is unreadable and
// every entry looks equally urgent; plotted on severity against likelihood,
// the two or three that actually decide the outcome separate themselves in
// the top-right and the rest recede — which is the judgement a list refuses
// to make. The ranked list is still underneath, because the plot answers
// "which ones matter" and only the list answers "what do I do about it".

import { useState } from "react";

import type { RiskItem, RiskSeverity } from "@/lib/analyst/types";

const SEVERITY_X: Record<RiskSeverity, number> = {
  low: 0.15,
  medium: 0.42,
  high: 0.68,
  critical: 0.9,
};

const SEVERITY_COLOUR: Record<RiskSeverity, string> = {
  low: "var(--ink-3)",
  medium: "var(--accent-ink)",
  high: "var(--caution)",
  critical: "var(--negative)",
};

const SEVERITY_ORDER: RiskSeverity[] = ["critical", "high", "medium", "low"];

/** Spread points that would otherwise sit on top of each other. */
function jitter(index: number): { dx: number; dy: number } {
  const golden = 2.399963;
  const radius = 1.6 * Math.sqrt(index);
  return { dx: Math.cos(index * golden) * radius, dy: Math.sin(index * golden) * radius };
}

export const RiskMatrix = ({ risks }: { risks: RiskItem[] }) => {
  const [selected, setSelected] = useState<string | null>(null);

  if (!risks.length) {
    return (
      <p className="max-w-[62ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
        No risks were recorded in this run. That is not the same as there being none.
      </p>
    );
  }

  const ranked = [...risks].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    return bySeverity !== 0 ? bySeverity : (b.likelihood ?? 0) - (a.likelihood ?? 0);
  });

  const active = ranked.find((risk) => risk.id === selected) ?? null;

  // Plot geometry, in the SVG's own 100×72 space.
  const left = 12;
  const right = 97;
  const top = 6;
  const bottom = 60;
  const x = (severity: RiskSeverity) => left + (SEVERITY_X[severity] ?? 0.5) * (right - left);
  const y = (likelihood: number) => bottom - Math.min(1, Math.max(0, likelihood)) * (bottom - top);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <figure className="min-w-0">
        <svg viewBox="0 0 100 72" className="h-auto w-full" role="img" aria-label="Risks by severity and likelihood">
          {/* Grid: four severity columns, likelihood on the vertical. */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={left} x2={right} y1={y(tick)} y2={y(tick)}
                stroke="var(--rule)" strokeWidth={0.25}
              />
              <text x={left - 2} y={y(tick) + 1.2} textAnchor="end" fontSize="2.6" fill="var(--ink-3)">
                {Math.round(tick * 100)}%
              </text>
            </g>
          ))}

          {SEVERITY_ORDER.slice().reverse().map((severity) => (
            <text
              key={severity}
              x={x(severity)}
              y={bottom + 5}
              textAnchor="middle"
              fontSize="2.8"
              fill="var(--ink-3)"
            >
              {severity}
            </text>
          ))}

          <text x={left - 2} y={top - 1.5} textAnchor="end" fontSize="2.6" fill="var(--ink-3)">
            likelihood
          </text>
          <text x={right} y={bottom + 10} textAnchor="end" fontSize="2.6" fill="var(--ink-3)">
            severity →
          </text>

          {ranked.map((risk, index) => {
            const offset = jitter(index);
            const isActive = risk.id === selected;
            return (
              <circle
                key={risk.id}
                cx={x(risk.severity) + offset.dx}
                cy={y(risk.likelihood ?? 0.5) + offset.dy}
                r={isActive ? 2.4 : 1.7}
                fill={SEVERITY_COLOUR[risk.severity]}
                fillOpacity={isActive ? 1 : 0.65}
                stroke="var(--page)"
                strokeWidth={0.5}
                onMouseEnter={() => setSelected(risk.id)}
                onFocus={() => setSelected(risk.id)}
                tabIndex={0}
                role="button"
                aria-label={`${risk.title}: ${risk.severity} severity, ${Math.round((risk.likelihood ?? 0) * 100)} per cent likelihood`}
                style={{ cursor: "pointer", transition: "r var(--dur-fast) var(--ease-out)" }}
              />
            );
          })}
        </svg>

        <figcaption className="mt-3 text-[12px] leading-relaxed text-[var(--ink-3)]">
          {risks.length} risks. Each dot is one; hover or focus to read it. Top-right is the corner that decides
          the outcome — high severity that is also likely.
        </figcaption>
      </figure>

      <div className="min-w-0 lg:border-l lg:border-[var(--rule)] lg:pl-8">
        {active ? (
          <div className="enter-up">
            <p className="kicker" style={{ color: SEVERITY_COLOUR[active.severity] }}>
              {active.severity} · {Math.round((active.likelihood ?? 0) * 100)}% likely
            </p>
            <h3 className="mt-3 text-[16px] font-medium leading-snug tracking-[-0.01em] text-[var(--ink-1)]">
              {active.title}
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-2)]">{active.description}</p>
            {active.mitigation && (
              <>
                <p className="kicker mt-5">What would reduce it</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ink-2)]">{active.mitigation}</p>
              </>
            )}
            {active.category && (
              <p className="mt-5 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]">{active.category}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="kicker">Most serious first</p>
            <ul className="mt-4 space-y-3">
              {ranked.slice(0, 8).map((risk) => (
                <li key={risk.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setSelected(risk.id)}
                    onClick={() => setSelected(risk.id)}
                    className="flex w-full items-start gap-2.5 text-left"
                  >
                    <span
                      className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: SEVERITY_COLOUR[risk.severity] }}
                      aria-hidden
                    />
                    <span className="min-w-0 text-[12.5px] leading-relaxed text-[var(--ink-2)]">{risk.title}</span>
                  </button>
                </li>
              ))}
            </ul>
            {ranked.length > 8 && (
              <p className="mt-4 text-[12px] text-[var(--ink-3)]">
                {ranked.length - 8} more on the plot.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskMatrix;

// One methodology, opened up.
//
// Each component gets a bar, the figure it contributed, and — on expansion —
// the sentence explaining why it landed there and which derived factors fed
// it. The assumptions and the limitations sit at the bottom of every method,
// unavoidably, because a valuation method without its limitations is a
// number pretending to be a fact.

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { formatUsd } from "@/components/analyst/primitives";
import { FACTOR_BY_KEY, type MethodologyOutcome } from "@/lib/assessment";

const strengthWord = (score: number): string =>
  score >= 0.8 ? "Very strong"
    : score >= 0.62 ? "Strong"
      : score >= 0.45 ? "Moderate"
        : score >= 0.28 ? "Weak"
          : "Very weak";

const strengthColor = (score: number): string =>
  score >= 0.62 ? "var(--positive)"
    : score >= 0.45 ? "var(--accent-ink)"
      : score >= 0.28 ? "var(--caution)"
        : "var(--negative)";

export const MethodologyDetail = ({
  methodology, defaultOpen = false,
}: {
  methodology: MethodologyOutcome;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (methodology.status !== "computed") {
    return (
      <div className="border-b border-[var(--rule)] py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span className="text-[14px] text-[var(--ink-2)]">{methodology.name}</span>
          <span className="text-[12px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
            {methodology.status === "not_applicable" ? "Not applicable" : "Insufficient input"}
          </span>
        </div>
        <p className="mt-2 max-w-[74ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">{methodology.reason}</p>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--rule)]">
      <h3>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="w-full py-5 text-left"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="flex items-center gap-3 text-[15px] font-medium text-[var(--ink-1)]">
              {methodology.name}
              <ChevronDown
                className={`h-3.5 w-3.5 text-[var(--ink-3)] transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </span>
            <span className="flex items-baseline gap-4">
              <span className="text-[11px] tabular-nums text-[var(--ink-3)]">
                {Math.round(methodology.confidence * 100)}% confidence
              </span>
              <span className="text-[17px] font-medium tabular-nums tracking-[-0.02em] text-[var(--ink-1)]">
                {formatUsd(methodology.range!.point)}
              </span>
            </span>
          </div>
          <p className="mt-2 max-w-[74ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
            {methodology.headline}
          </p>
        </button>
      </h3>

      {open && (
        <div className="enter-up pb-8">
          <p className="measure text-[13.5px] leading-[1.7] text-[var(--ink-2)]">{methodology.purpose}</p>

          <ul className="mt-6">
            {methodology.components.map((component) => {
              const isOpen = expanded === component.key;
              return (
                <li key={component.key} className="border-t border-[var(--rule)]">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : component.key)}
                    aria-expanded={isOpen}
                    className="w-full py-3 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-40 shrink-0 truncate text-[13px] text-[var(--ink-2)]" title={component.label}>
                        {component.label}
                      </span>

                      <span className="relative h-[10px] min-w-0 flex-1">
                        <span className="absolute inset-x-0 top-[4px] h-[2px] bg-[var(--rule)]" aria-hidden />
                        <span
                          className="absolute top-0 h-[10px] rounded-r-[3px]"
                          style={{
                            width: `${Math.max(2, component.score * 100)}%`,
                            background: strengthColor(component.score),
                          }}
                          aria-hidden
                        />
                      </span>

                      <span className="hidden w-24 shrink-0 text-right text-[11px] text-[var(--ink-3)] sm:block">
                        {strengthWord(component.score)}
                      </span>
                      <span className="w-28 shrink-0 text-right text-[13px] tabular-nums text-[var(--ink-1)]">
                        {component.display}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="enter-up pb-4 pl-0 sm:pl-44">
                      <p className="measure text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                        {component.rationale}
                      </p>
                      <p className="mt-2 text-[11px] text-[var(--ink-3)]">
                        Derived from{" "}
                        {component.from.map((key) => FACTOR_BY_KEY[key]?.label ?? key).join(", ")}
                        {component.weight !== undefined && ` · factor weight ${Math.round(component.weight * 100)}%`}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="kicker">Assumptions</p>
              <ul className="mt-3 space-y-2">
                {methodology.assumptions.map((assumption) => (
                  <li key={assumption} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                    <span aria-hidden>·</span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="kicker">What this method cannot see</p>
              <ul className="mt-3 space-y-2">
                {methodology.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                    <span aria-hidden>·</span>
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MethodologyDetail;

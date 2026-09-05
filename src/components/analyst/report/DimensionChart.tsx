// The nine dimensions the analyst scored, twice.
//
// Score and confidence are drawn as two small multiples on identical axes
// rather than as two series on one chart. The comparison that matters is
// shape against shape: wherever the score polygon reaches past the confidence
// polygon, the company is being credited for something the evidence does not
// yet carry. One series per chart also means no categorical palette and no
// legend to misread.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip,
} from "recharts";

import type { ScoredSection } from "@/lib/analyst/types";
import { confidenceLabel } from "../primitives";

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { dimension: string } }[];
  suffix: string;
}

const TooltipBox = ({ active, payload, suffix }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-[var(--rule-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--ink-1)] shadow-[var(--shadow-md)]">
      <span className="block">{payload[0].payload.dimension}</span>
      <span className="block tabular-nums text-[var(--ink-3)]">
        {payload[0].value}
        {suffix}
      </span>
    </div>
  );
};

const Chart = ({
  data, dataKey, title, caption, suffix,
}: {
  data: { dimension: string; score: number; confidence: number }[];
  dataKey: "score" | "confidence";
  title: string;
  caption: string;
  suffix: string;
}) => (
  <figure className="min-w-0">
    <figcaption>
      <p className="kicker">{title}</p>
      <p className="mt-2 max-w-[36ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">{caption}</p>
    </figcaption>
    <div className="mt-4 h-[290px]" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--rule)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--ink-3)", fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey={dataKey}
            stroke="var(--accent-ink)"
            strokeWidth={2}
            fill="var(--accent-ink)"
            fillOpacity={0.13}
            isAnimationActive={false}
          />
          <Tooltip content={<TooltipBox suffix={suffix} />} cursor={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  </figure>
);

/** A dimension, opened onto the evidence and assumptions behind its score. */
const Row = ({ section }: { section: ScoredSection }) => {
  const [open, setOpen] = useState(false);
  const score = Math.max(0, Math.min(10, section.score10 ?? 0));
  const colour =
    score >= 7 ? "var(--positive)"
      : score >= 5 ? "var(--accent-ink)"
        : score >= 3.5 ? "var(--caution)"
          : "var(--negative)";

  return (
    <li className="border-b border-[var(--rule)] last:border-b-0">
      <h3>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full py-4 text-left">
          <div className="flex items-center gap-5">
            <span className="w-44 shrink-0 truncate text-[13.5px] text-[var(--ink-1)]" title={section.title}>
              {section.title}
            </span>
            <span className="relative h-[10px] min-w-0 flex-1">
              <span className="absolute inset-x-0 top-[4px] h-[2px] bg-[var(--rule)]" aria-hidden />
              <span
                className="absolute top-0 h-[10px] rounded-r-[3px]"
                style={{ width: `${score * 10}%`, background: colour }}
                aria-hidden
              />
            </span>
            <span className="w-10 shrink-0 text-right text-[13.5px] tabular-nums text-[var(--ink-1)]">
              {score.toFixed(1)}
            </span>
            <span className="hidden w-24 shrink-0 text-right text-[11px] tabular-nums text-[var(--ink-3)] sm:block">
              {Math.round((section.confidence ?? 0) * 100)}% conf.
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-[var(--ink-3)] transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </div>
        </button>
      </h3>

      {open && (
        <div className="enter-up pb-6 sm:pl-[196px]">
          <p className="measure text-[13px] leading-[1.75] text-[var(--ink-2)]">{section.narrative}</p>

          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            <Block title="Evidence" items={section.evidence} tone="var(--ink-2)" />
            <Block title="Assumed" items={section.keyAssumptions} tone="var(--ink-2)" />
            <Block title="Missing" items={section.missingInformation} tone="var(--ink-3)" />
          </div>
        </div>
      )}
    </li>
  );
};

const Block = ({ title, items, tone }: { title: string; items: string[]; tone: string }) => (
  <div>
    <p className="kicker">{title}</p>
    {items?.length ? (
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 text-[12.5px] leading-relaxed" style={{ color: tone }}>
            <span aria-hidden className="text-[var(--ink-3)]">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-[12.5px] text-[var(--ink-3)]">None recorded.</p>
    )}
  </div>
);

/**
 * Two words is all the axis can carry at this radius. Cutting blindly leaves
 * danglers like "Product &", so trailing conjunctions are dropped with the
 * word they were joining.
 */
function axisLabel(title: string): string {
  const words = title.split(/\s+/).slice(0, 2);
  while (words.length && /^(&|and|\/|of|the)$/i.test(words[words.length - 1])) words.pop();
  return words.join(" ") || title;
}

export const DimensionChart = ({ sections }: { sections: ScoredSection[] }) => {
  const scored = sections.filter((section) => typeof section.score10 === "number");
  if (!scored.length) {
    return <p className="text-[13px] text-[var(--ink-3)]">No dimensions were scored in this run.</p>;
  }

  const data = scored.map((section) => ({
    dimension: axisLabel(section.title),
    score: Math.round((section.score10 ?? 0) * 10),
    confidence: Math.round((section.confidence ?? 0) * 100),
  }));

  return (
    <div>
      <div className="grid gap-10 sm:grid-cols-2">
        <Chart
          data={data}
          dataKey="score"
          title="Score by dimension"
          caption="Out of 100. The shape is the company as the analysis reads it."
          suffix=" / 100"
        />
        <Chart
          data={data}
          dataKey="confidence"
          title="Confidence by dimension"
          caption="How much the evidence behind each score can carry. Where this shape is smaller, treat the one beside it with care."
          suffix="% confidence"
        />
      </div>

      <ul className="mt-10">
        {scored.map((section) => (
          <Row key={section.key} section={section} />
        ))}
      </ul>

      <p className="mt-6 text-[12px] text-[var(--ink-3)]">
        Open any dimension for the evidence it rests on, what it assumed, and what it could not establish.
        {" "}
        The weakest dimension here is{" "}
        {scored.reduce((worst, section) => ((section.confidence ?? 0) < (worst.confidence ?? 0) ? section : worst)).title.toLowerCase()}
        , at {confidenceLabel(Math.min(...scored.map((section) => section.confidence ?? 0))).toLowerCase()} confidence.
      </p>
    </div>
  );
};

export default DimensionChart;

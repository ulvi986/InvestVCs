// Score and confidence, as two small multiples on identical axes.
//
// Drawn as a pair rather than as two series on one chart, because the
// comparison that matters is shape against shape: where the score polygon
// reaches out further than the confidence polygon, the company is being
// credited for something it has not evidenced. One series per chart also
// means no categorical palette and no legend to misread.

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { FactorScore } from "@/lib/assessment";

interface FactorRadarProps {
  factors: FactorScore[];
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { factor: string } }[];
  suffix: string;
}

const TooltipBox = ({ active, payload, suffix }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="border border-[var(--rule-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--ink-1)] shadow-[var(--shadow-md)]">
      <span className="block">{row.factor}</span>
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
  data: { factor: string; score: number; confidence: number }[];
  dataKey: "score" | "confidence";
  title: string;
  caption: string;
  suffix: string;
}) => (
  <figure className="min-w-0">
    <figcaption>
      <p className="kicker">{title}</p>
      <p className="mt-2 max-w-[34ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">{caption}</p>
    </figcaption>

    <div className="mt-4 h-[280px]" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--rule)" />
          <PolarAngleAxis
            dataKey="factor"
            tick={{ fill: "var(--ink-3)", fontSize: 10.5 }}
          />
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

export const FactorRadar = ({ factors }: FactorRadarProps) => {
  const data = factors.map((factor) => ({
    factor: factor.label,
    score: factor.adjusted,
    confidence: Math.round(factor.confidence * 100),
  }));

  return (
    <div>
      <div className="grid gap-10 sm:grid-cols-2">
        <Chart
          data={data}
          dataKey="score"
          title="Score by factor"
          caption="Confidence-adjusted, out of 100. The shape is the company as your answers describe it."
          suffix=" / 100"
        />
        <Chart
          data={data}
          dataKey="confidence"
          title="Confidence by factor"
          caption="How much the evidence behind each score can carry. Where this shape is smaller, treat the one beside it with care."
          suffix="% confidence"
        />
      </div>

      {/* The same numbers as a table: the charts are a read, not the record. */}
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <caption className="sr-only">Factor scores and confidence</caption>
          <thead>
            <tr className="border-b border-[var(--rule-strong)]">
              {["Factor", "Raw", "Adjusted", "Confidence", "Evidence", "Coverage"].map((heading, index) => (
                <th
                  key={heading}
                  scope="col"
                  className={`pb-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--ink-3)] ${index ? "text-right" : ""}`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {factors.map((factor) => (
              <tr key={factor.key} className="border-b border-[var(--rule)]">
                <th scope="row" className="py-2.5 text-[13px] font-normal text-[var(--ink-1)]">{factor.label}</th>
                <td className="py-2.5 text-right text-[13px] tabular-nums text-[var(--ink-3)]">{factor.raw}</td>
                <td className="py-2.5 text-right text-[13px] tabular-nums text-[var(--ink-1)]">{factor.adjusted}</td>
                <td className="py-2.5 text-right text-[13px] tabular-nums text-[var(--ink-2)]">
                  {Math.round(factor.confidence * 100)}%
                </td>
                <td className="py-2.5 text-right text-[13px] tabular-nums text-[var(--ink-2)]">
                  {Math.round(factor.evidenceQuality * 100)}%
                </td>
                <td className="py-2.5 text-right text-[13px] tabular-nums text-[var(--ink-3)]">
                  {Math.round(factor.coverage * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FactorRadar;

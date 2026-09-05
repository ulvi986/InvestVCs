// Per-methodology results — the analyst's working, opened up.
//
// Every methodology exposes what it was given, what it assigned, what the
// platform computed from that, and the evidence behind it. A user who
// disagrees with the conclusion can find the exact input to argue with.

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { EvidenceRef, MethodologyResult, SourceType } from "@/lib/analyst/types";
import { getMethodology } from "@/lib/analyst/registry";
import {
  ConfidenceMeter, Empty, Eyebrow, Figure, Panel, SeverityTag, StatusIcon, Tag, formatUsd,
} from "./primitives";

const SOURCE_LABEL: Record<SourceType, string> = {
  provided: "Provided",
  derived: "Derived",
  inferred: "Inferred",
  absent: "Missing",
};

const SOURCE_TONE: Record<SourceType, "neutral" | "accent" | "muted"> = {
  provided: "accent",
  derived: "neutral",
  inferred: "muted",
  absent: "muted",
};

const humanise = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\bUsd\b/g, "USD")
    .replace(/\bPct\b/g, "%")
    .replace(/^./, (c) => c.toUpperCase());

const renderValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (/usd|valuation|revenue|cash|amount|adjustment/i.test(key)) return formatUsd(value);
    return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toFixed(2);
  }
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${humanise(k)}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(" · ");
  }
  return String(value);
};

/** Flat key/value view of an agent's assigned inputs or the computed output. */
const DataGrid = ({ data, limit = 12 }: { data: Record<string, unknown>; limit?: number }) => {
  const entries = Object.entries(data ?? {})
    .filter(([key, value]) => value !== undefined && value !== null && value !== "" && key !== "platformNotes")
    .slice(0, limit);

  if (!entries.length) return <Empty>Nothing recorded.</Empty>;

  return (
    <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-3 border-b border-[var(--rule)] py-1.5">
          <dt className="text-xs text-muted-foreground">{humanise(key)}</dt>
          <dd className="truncate text-right text-xs font-medium text-foreground/85" title={renderValue(key, value)}>
            {renderValue(key, value)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export const EvidenceList = ({ evidence }: { evidence: EvidenceRef[] }) => {
  if (!evidence.length) return <Empty>No evidence was recorded for this result.</Empty>;

  return (
    <ul className="space-y-2.5">
      {evidence.map((item) => (
        <li key={item.id} className="rounded-lg border border-[var(--rule)] bg-[var(--band)] p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-snug text-foreground/90">{item.claim}</p>
            <Tag tone={SOURCE_TONE[item.sourceType]}>{SOURCE_LABEL[item.sourceType]}</Tag>
          </div>
          <p className="mt-1.5 text-xs font-light leading-relaxed text-muted-foreground">{item.evidence}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
            <span>Source: {item.source}</span>
            <span className="tabular-nums">Confidence {item.confidence.toFixed(2)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
};

const Bullets = ({ title, items }: { title: string; items: string[] }) => {
  if (!items?.length) return null;
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm font-light leading-relaxed text-muted-foreground">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const MethodologyResults = ({
  results, order, onRerun, rerunning,
}: {
  results: Record<string, MethodologyResult>;
  order?: string[];
  onRerun?: (methodologyId: string) => void;
  rerunning?: string | null;
}) => {
  const [open, setOpen] = useState<string[]>([]);

  const list = (order ?? Object.keys(results))
    .map((id) => results[id])
    .filter(Boolean);

  if (!list.length) {
    return (
      <Panel title="Methodology results">
        <Empty>No methodology has produced a result yet.</Empty>
      </Panel>
    );
  }

  return (
    <Panel title="Methodology results" subtitle={`${list.filter((r) => r.status === "completed").length} of ${list.length} completed`} dense>
      <Accordion type="multiple" value={open} onValueChange={setOpen} className="divide-y divide-white/[0.06]">
        {list.map((result) => {
          const spec = getMethodology(result.methodologyId);
          const notes: string[] = ((result.computed as any)?.platformNotes ?? []) as string[];

          return (
            <AccordionItem key={result.methodologyId} value={result.methodologyId} className="border-0">
              <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-muted-foreground">
                <div className="flex w-full items-center gap-3 pr-3 text-left">
                  <StatusIcon status={result.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{result.name}</p>
                    <p className="mt-0.5 truncate text-xs font-light text-muted-foreground">
                      {result.status === "failed"
                        ? result.error
                        : result.headline || spec?.purpose}
                    </p>
                  </div>
                  {result.valuation && (
                    <Figure className="hidden shrink-0 text-sm font-medium text-foreground sm:block">
                      {formatUsd(result.valuation.point)}
                    </Figure>
                  )}
                  {result.score10 !== undefined && result.score10 !== null && !result.valuation && (
                    <Figure className="hidden shrink-0 text-sm font-medium text-foreground sm:block">
                      {result.score10.toFixed(1)}/10
                    </Figure>
                  )}
                  {result.status === "completed" && (
                    <div className="hidden shrink-0 sm:block">
                      <ConfidenceMeter value={result.confidence} compact />
                    </div>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="space-y-5 px-5 pb-5">
                {result.status === "failed" ? (
                  <p className="text-sm text-muted-foreground">
                    This methodology did not complete: {result.error}. The rest of the analysis continued without it,
                    and the final report records it as incomplete.
                  </p>
                ) : (
                  <>
                    {result.valuation && (
                      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-lg border border-[var(--rule)] bg-[var(--band)] px-4 py-3">
                        <div>
                          <Eyebrow>Point estimate</Eyebrow>
                          <Figure className="mt-0.5 block text-lg text-foreground">{formatUsd(result.valuation.point)}</Figure>
                        </div>
                        <div>
                          <Eyebrow>Range</Eyebrow>
                          <Figure className="mt-0.5 block text-sm text-muted-foreground">
                            {formatUsd(result.valuation.low)} – {formatUsd(result.valuation.high)}
                          </Figure>
                        </div>
                        <div className="min-w-[140px] flex-1">
                          <ConfidenceMeter value={result.confidence} />
                        </div>
                      </div>
                    )}

                    {result.reasoning && (
                      <p className="text-sm font-light leading-relaxed text-foreground/85">{result.reasoning}</p>
                    )}

                    {notes.length > 0 && (
                      <div className="rounded-lg border-l-2 border-[var(--caution)] border-y border-r border-[var(--rule)] bg-[var(--band)] px-4 py-3">
                        <Eyebrow>Platform checks</Eyebrow>
                        <ul className="mt-2 space-y-1.5">
                          {notes.map((note, i) => (
                            <li key={i} className="text-sm font-light leading-relaxed text-muted-foreground">{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid gap-5 lg:grid-cols-2">
                      <div>
                        <Eyebrow>Inputs the agent assigned</Eyebrow>
                        <div className="mt-2">
                          <DataGrid data={result.inputs as Record<string, unknown>} />
                        </div>
                      </div>
                      <div>
                        <Eyebrow>Computed by the platform</Eyebrow>
                        <div className="mt-2">
                          <DataGrid data={result.computed as Record<string, unknown>} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <Bullets title="Assumptions" items={result.assumptions} />
                      <Bullets title="Limitations" items={result.limitations} />
                      <Bullets title="Missing inputs" items={result.missingInputs} />
                    </div>

                    {result.risks.length > 0 && (
                      <div>
                        <Eyebrow>Risks surfaced</Eyebrow>
                        <ul className="mt-2 space-y-2">
                          {result.risks.map((risk) => (
                            <li key={risk.id} className="flex items-start gap-3">
                              <SeverityTag severity={risk.severity} />
                              <div className="min-w-0">
                                <p className="text-sm text-foreground/90">{risk.title}</p>
                                <p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground">{risk.description}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <Eyebrow>Evidence</Eyebrow>
                      <div className="mt-2">
                        <EvidenceList evidence={result.evidence} />
                      </div>
                    </div>
                  </>
                )}

                {onRerun && (
                  <div className="flex justify-end border-t border-[var(--rule)] pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-lg"
                      disabled={Boolean(rerunning)}
                      onClick={() => onRerun(result.methodologyId)}
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${rerunning === result.methodologyId ? "animate-spin" : ""}`} />
                      {rerunning === result.methodologyId ? "Re-running" : "Re-run this methodology"}
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Panel>
  );
};

export default MethodologyResults;

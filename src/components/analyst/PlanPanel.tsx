// Why the analyst chose the methodologies it chose — and why it ruled the
// others out. Deselected methodologies are shown too: the reason a tool was
// not used is often more informative than the reason one was.

import type { AnalysisPlan } from "@/lib/analyst/types";
import { getMethodology } from "@/lib/analyst/registry";
import { Empty, Eyebrow, Figure, Panel, Tag } from "./primitives";
import { Check, Minus } from "lucide-react";

export const PlanPanel = ({ plan }: { plan: AnalysisPlan | null }) => {
  if (!plan) {
    return (
      <Panel title="Methodology selection">
        <Empty>The analyst has not chosen its methodologies yet.</Empty>
      </Panel>
    );
  }

  const selected = plan.entries.filter((entry) => entry.selected);
  const rejected = plan.entries.filter((entry) => !entry.selected);

  return (
    <Panel
      title="Methodology selection"
      subtitle={plan.strategy}
      actions={<Tag tone="muted">{selected.length} of {plan.entries.length} applied</Tag>}
    >
      {plan.focus.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Eyebrow className="mr-1">Focus</Eyebrow>
          {plan.focus.map((item, i) => (
            <Tag key={i} tone="accent">{item}</Tag>
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {selected.map((entry) => {
          const spec = getMethodology(entry.methodologyId);
          return (
            <li key={entry.methodologyId} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--positive)]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="text-sm font-medium text-foreground">{spec?.name ?? entry.methodologyId}</p>
                  <Figure className="text-[11px] text-muted-foreground/70">
                    expected confidence {entry.expectedConfidence.toFixed(2)}
                  </Figure>
                </div>
                <p className="mt-1 text-sm font-light leading-relaxed text-muted-foreground">{entry.reason}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {rejected.length > 0 && (
        <div className="mt-6 border-t border-[var(--rule)] pt-5">
          <Eyebrow>Not applied</Eyebrow>
          <ul className="mt-3 space-y-2.5">
            {rejected.map((entry) => {
              const spec = getMethodology(entry.methodologyId);
              return (
                <li key={entry.methodologyId} className="flex items-start gap-3">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">{spec?.name ?? entry.methodologyId}</p>
                    <p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground/80">{entry.reason}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {plan.notes && (
        <p className="mt-5 border-t border-[var(--rule)] pt-4 text-sm font-light leading-relaxed text-muted-foreground">
          {plan.notes}
        </p>
      )}
    </Panel>
  );
};

export default PlanPanel;

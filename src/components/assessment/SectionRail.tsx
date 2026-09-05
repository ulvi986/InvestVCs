// Where the founder is in the interview.
//
// The totals move as the questionnaire branches, which is deliberate: a
// company with revenue genuinely has more to answer than one with an idea,
// and pretending otherwise would either pad the short path or lie about the
// long one.

import { Check } from "lucide-react";
import type { Progress, SectionKey } from "@/lib/assessment";

interface SectionRailProps {
  progress: Progress;
  currentSection: SectionKey | null;
}

export const SectionRail = ({ progress, currentSection }: SectionRailProps) => (
  <nav aria-label="Assessment progress" className="space-y-1">
    <p className="kicker mb-4">Interview</p>

    {progress.sections.map((section) => {
      const done = section.total > 0 && section.answered >= section.total;
      const active = section.key === currentSection;
      const ratio = section.total ? section.answered / section.total : 0;

      return (
        <div key={section.key} className="py-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="flex items-center gap-2 text-[13px]"
              style={{ color: active ? "var(--ink-1)" : done ? "var(--ink-2)" : "var(--ink-3)" }}
            >
              {done ? (
                <Check className="h-3 w-3 shrink-0" style={{ color: "var(--positive)" }} aria-hidden />
              ) : (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: active ? "var(--accent-ink)" : "var(--rule-strong)" }}
                  aria-hidden
                />
              )}
              {section.label}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-[var(--ink-3)]">
              {section.answered}/{section.total}
            </span>
          </div>
          <span className="analyst-bar mt-2 block">
            <span
              style={{
                width: `${ratio * 100}%`,
                background: done ? "var(--positive)" : "var(--accent-ink)",
              }}
            />
          </span>
        </div>
      );
    })}

    <p className="mt-6 border-t border-[var(--rule)] pt-4 text-[12px] leading-relaxed text-[var(--ink-3)]">
      Questions adapt to your answers. A company without a product is never asked about churn.
    </p>
  </nav>
);

export default SectionRail;

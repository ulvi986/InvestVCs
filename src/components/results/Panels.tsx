// The reading panels: what helped, what hurt, what is unresolved, and what
// is still missing.
//
// Each item carries the answer it came from, so none of it reads as an
// opinion the system formed on its own.

import { AlertTriangle, ArrowUpRight, CircleDashed, PenLine } from "lucide-react";

import {
  SECTION_BY_KEY,
  type Contradiction,
  type DriverItem,
  type GapItem,
  type Resolution,
  type RiskIndicator,
} from "@/lib/assessment";

const SEVERITY_COLOR = {
  high: "var(--negative)",
  medium: "var(--caution)",
  low: "var(--ink-3)",
} as const;

/* ── Strengths and weaknesses ─────────────────────────────────────────── */

const DriverList = ({
  title, items, tone, empty,
}: {
  title: string;
  items: DriverItem[];
  tone: "positive" | "negative";
  empty: string;
}) => (
  <div>
    <p className="kicker">{title}</p>
    {items.length === 0 ? (
      <p className="mt-3 max-w-[44ch] text-[13px] leading-relaxed text-[var(--ink-3)]">{empty}</p>
    ) : (
      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={item.factor} className="flex gap-3">
            <span
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: tone === "positive" ? "var(--positive)" : "var(--caution)" }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block text-[13.5px] text-[var(--ink-1)]">{item.label}</span>
              <span className="mt-1 block max-w-[52ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                {item.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const KeyDrivers = ({
  strengths, weaknesses,
}: {
  strengths: DriverItem[];
  weaknesses: DriverItem[];
}) => (
  <div className="grid gap-10 sm:grid-cols-2">
    <DriverList
      title="Working in your favour"
      items={strengths}
      tone="positive"
      empty="No factor scored above the neutral prior yet. That is usually a coverage problem rather than a company problem — the interview has not reached far enough."
    />
    <DriverList
      title="Working against you"
      items={weaknesses}
      tone="negative"
      empty="No factor scored below the neutral prior."
    />
  </div>
);

/* ── Risks ────────────────────────────────────────────────────────────── */

export const RiskList = ({ risks }: { risks: RiskIndicator[] }) => {
  if (!risks.length) {
    return (
      <p className="max-w-[60ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
        Nothing in your answers tripped a risk flag. This is not the same as there being no risk — it means the
        specific patterns this system checks for did not appear.
      </p>
    );
  }

  return (
    <ul className="space-y-0">
      {risks.map((risk) => (
        <li key={risk.id} className="flex gap-4 border-b border-[var(--rule)] py-4 last:border-b-0">
          <span
            className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: SEVERITY_COLOR[risk.severity] }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-[13.5px] text-[var(--ink-1)]">{risk.title}</span>
              <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]">{risk.severity}</span>
            </div>
            <p className="mt-1.5 max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">{risk.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};

/* ── Contradictions ───────────────────────────────────────────────────── */

export const ContradictionList = ({
  contradictions, resolutions, onRevisit,
}: {
  contradictions: Contradiction[];
  resolutions: Record<string, Resolution>;
  onRevisit: (questionId: string) => void;
}) => {
  if (!contradictions.length) {
    return (
      <p className="max-w-[60ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
        Your answers are internally consistent. Every pair of questions that measures the same thing from two
        directions agreed, and no figure contradicted another.
      </p>
    );
  }

  return (
    <ul className="space-y-6">
      {contradictions.map((contradiction) => {
        const resolution = resolutions[contradiction.ruleId];
        return (
          <li
            key={contradiction.ruleId}
            className="border-l-2 pl-4"
            style={{ borderColor: resolution ? "var(--rule-strong)" : SEVERITY_COLOR[contradiction.severity] }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="flex items-center gap-2 text-[13.5px] text-[var(--ink-1)]">
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: resolution ? "var(--ink-3)" : SEVERITY_COLOR[contradiction.severity] }}
                  aria-hidden
                />
                {contradiction.title}
              </span>
              <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
                {resolution ? (resolution.outcome === "corrected" ? "Corrected" : "Explained") : `${contradiction.severity} · open`}
              </span>
            </div>

            <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-[var(--ink-2)]">
              {contradiction.message}
            </p>

            {resolution?.note && (
              <p className="mt-2 max-w-[70ch] border-l border-[var(--rule)] pl-3 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                Your explanation: {resolution.note}
              </p>
            )}

            {!resolution && (
              <>
                <p className="mt-2 max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                  {contradiction.clarification}
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  {contradiction.questionIds.map((questionId) => (
                    <button
                      key={questionId}
                      type="button"
                      onClick={() => onRevisit(questionId)}
                      className="inline-flex items-center gap-1.5 text-[12px] text-[var(--accent-ink)] transition-opacity hover:opacity-70"
                    >
                      <PenLine className="h-3 w-3" aria-hidden />
                      Revisit that answer
                    </button>
                  ))}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/* ── Gaps ─────────────────────────────────────────────────────────────── */

export const GapList = ({
  gaps, onAnswer,
}: {
  gaps: GapItem[];
  onAnswer: () => void;
}) => {
  if (!gaps.length) {
    return (
      <p className="max-w-[60ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
        Every applicable question has an answer. Confidence from here improves by evidence quality, not by volume.
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-0">
        {gaps.map((gap) => (
          <li key={gap.questionId} className="flex items-start gap-4 border-b border-[var(--rule)] py-3.5 last:border-b-0">
            <CircleDashed className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-relaxed text-[var(--ink-1)]">{gap.prompt}</p>
              <p className="mt-1 text-[11.5px] text-[var(--ink-3)]">
                {SECTION_BY_KEY[gap.section]?.label ?? gap.section} · would firm up{" "}
                {gap.affects.join(", ")}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAnswer}
        className="mt-6 inline-flex items-center gap-2 text-[13px] text-[var(--accent-ink)] transition-opacity hover:opacity-70"
      >
        Answer these
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
};

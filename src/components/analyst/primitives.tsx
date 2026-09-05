// Display primitives for the analyst surface.
//
// Design direction, taken from the Boost reference: no cards, no shadows, no
// gradients. Sections are separated by hairline rules and whitespace, type is
// sans throughout, and the palette's colour appears only as status — never as
// decoration. The tokens live in `.analyst` in `src/index.css`.

import { ReactNode } from "react";
import { AlertTriangle, Check, Circle, Loader2, Minus, X } from "lucide-react";
import type { MethodologyStatus, Recommendation, RiskSeverity } from "@/lib/analyst/types";
import type { NodeStatus } from "@/lib/analyst/graphTypes";

/* ── Formatting ─────────────────────────────────────────────────────── */

export function formatUsd(value: number | null | undefined, options: { compact?: boolean } = {}): string {
  if (value === null || value === undefined || !isFinite(value)) return "—";
  if (options.compact !== false) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 2)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  }
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export const formatDuration = (ms: number | null | undefined): string => {
  if (!ms || !isFinite(ms)) return "";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
};

/* ── Text ───────────────────────────────────────────────────────────── */

export const Eyebrow = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`text-[11px] uppercase tracking-[0.18em] text-[var(--ink-3)] ${className}`}>{children}</p>
);

export const Figure = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`tabular-nums tracking-tight ${className}`}>{children}</span>
);

export const Lede = ({ children }: { children: ReactNode }) => (
  <p className="max-w-[68ch] text-[15px] leading-[1.7] text-[var(--ink-1)]">{children}</p>
);

export const Body = ({ children }: { children: ReactNode }) => (
  <p className="max-w-[72ch] text-[13.5px] leading-[1.75] text-[var(--ink-2)]">{children}</p>
);

/* ── Surfaces ───────────────────────────────────────────────────────── */

/**
 * A section, not a card: a rule above, a label, then content. `Panel` keeps
 * its old name so every call site did not have to change, but it no longer
 * draws a box.
 */
export const Panel = ({
  title, subtitle, actions, children, className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Retained for call-site compatibility; spacing is uniform now. */
  dense?: boolean;
}) => (
  <section className={`analyst-section ${className}`}>
    {(title || actions) && (
      <header className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          {typeof title === "string" ? <Eyebrow>{title}</Eyebrow> : title}
          {subtitle && (
            <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-[var(--ink-2)]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </header>
    )}
    {children}
  </section>
);

export const Row = ({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-6 border-b border-[var(--rule)] py-2 last:border-b-0">
    <span className="text-[13px] text-[var(--ink-3)]">{label}</span>
    <span className="text-right text-[13px] text-[var(--ink-1)]">
      {value}
      {hint && <span className="ml-2 text-[11px] text-[var(--ink-3)]">{hint}</span>}
    </span>
  </div>
);

/* ── Status ─────────────────────────────────────────────────────────── */

export const StatusIcon = ({ status }: { status: NodeStatus | MethodologyStatus | "pending" }) => {
  const common = "h-3.5 w-3.5 shrink-0";
  switch (status) {
    case "completed":
      return <Check className={`${common} text-[var(--positive)]`} aria-label="completed" />;
    case "running":
      return <Loader2 className={`${common} animate-spin text-[var(--accent-ink)]`} aria-label="running" />;
    case "failed":
      return <X className={`${common} text-[var(--negative)]`} aria-label="failed" />;
    case "insufficient_input":
      return <AlertTriangle className={`${common} text-[var(--caution)]`} aria-label="insufficient input" />;
    case "skipped":
      return <Minus className={`${common} text-[var(--ink-3)]`} aria-label="skipped" />;
    default:
      return <Circle className={`${common} text-[var(--ink-3)] opacity-40`} aria-label="pending" />;
  }
};

const SEVERITY_COLOR: Record<RiskSeverity, string> = {
  critical: "var(--negative)",
  high: "var(--caution)",
  medium: "var(--accent-ink)",
  low: "var(--ink-3)",
};

export const SeverityTag = ({ severity }: { severity: RiskSeverity }) => (
  <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
    <span
      className="h-1.5 w-1.5 rounded-full"
      style={{ background: SEVERITY_COLOR[severity] ?? SEVERITY_COLOR.low }}
    />
    {severity}
  </span>
);

export const Tag = ({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "muted" }) => (
  <span
    className="inline-flex shrink-0 items-center border px-2 py-0.5 text-[11px]"
    style={
      tone === "accent"
        ? { borderColor: "color-mix(in srgb, var(--accent-ink) 40%, transparent)", color: "var(--accent-ink)" }
        : tone === "muted"
          ? { borderColor: "var(--rule)", color: "var(--ink-3)" }
          : { borderColor: "var(--rule-strong)", color: "var(--ink-2)" }
    }
  >
    {children}
  </span>
);

/* ── Meters ─────────────────────────────────────────────────────────── */

const meterColour = (value: number) =>
  value >= 0.7 ? "var(--positive)"
    : value >= 0.45 ? "var(--accent-ink)"
      : value >= 0.25 ? "var(--caution)"
        : "var(--negative)";

export const confidenceLabel = (value: number): string =>
  value >= 0.7 ? "High" : value >= 0.45 ? "Moderate" : value >= 0.25 ? "Low" : "Very low";

export const ConfidenceMeter = ({
  value, label = "Confidence", compact = false,
}: {
  value: number;
  label?: string;
  compact?: boolean;
}) => {
  const clamped = Math.min(1, Math.max(0, value || 0));

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="analyst-bar w-14">
          <span style={{ width: `${clamped * 100}%`, background: meterColour(clamped) }} />
        </span>
        <Figure className="text-[11px] text-[var(--ink-3)]">{clamped.toFixed(2)}</Figure>
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <Eyebrow>{label}</Eyebrow>
        <Figure className="text-[13px] text-[var(--ink-1)]">
          {clamped.toFixed(2)}
          <span className="ml-2 text-[11px] text-[var(--ink-3)]">{confidenceLabel(clamped)}</span>
        </Figure>
      </div>
      <span className="analyst-bar block w-full">
        <span style={{ width: `${clamped * 100}%`, background: meterColour(clamped) }} />
      </span>
    </div>
  );
};

export const ScoreBar = ({ label, score10, hint }: { label: string; score10: number; hint?: string }) => {
  const clamped = Math.min(10, Math.max(0, score10 || 0));
  return (
    <div className="flex items-center gap-4 border-b border-[var(--rule)] py-2.5 last:border-b-0">
      <span className="w-44 shrink-0 truncate text-[13px] text-[var(--ink-2)]" title={label}>{label}</span>
      <span className="analyst-bar flex-1">
        <span style={{ width: `${clamped * 10}%`, background: meterColour(clamped / 10) }} />
      </span>
      <Figure className="w-9 shrink-0 text-right text-[13px] text-[var(--ink-1)]">{clamped.toFixed(1)}</Figure>
      {hint && <span className="hidden w-20 shrink-0 truncate text-[11px] text-[var(--ink-3)] sm:block">{hint}</span>}
    </div>
  );
};

/* ── Recommendation ─────────────────────────────────────────────────── */

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  strong_invest: "Strong Invest",
  invest: "Invest",
  consider: "Consider",
  watch: "Watch",
  pass: "Pass",
};

const RECOMMENDATION_COLOR: Record<Recommendation, string> = {
  strong_invest: "var(--positive)",
  invest: "var(--positive)",
  consider: "var(--accent-ink)",
  watch: "var(--caution)",
  pass: "var(--negative)",
};

export const RecommendationBadge = ({ value, size = "md" }: { value: Recommendation; size?: "sm" | "md" | "lg" }) => {
  const color = RECOMMENDATION_COLOR[value] ?? RECOMMENDATION_COLOR.consider;

  if (size === "lg") {
    return (
      <span className="inline-flex items-baseline gap-3">
        <span className="h-2 w-2 shrink-0 -translate-y-[2px] rounded-full" style={{ background: color }} />
        <span className="text-[30px] font-medium leading-none tracking-[-0.02em] text-[var(--ink-1)]">
          {RECOMMENDATION_LABEL[value] ?? value}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${size === "sm" ? "text-[11px]" : "text-[12px]"}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="uppercase tracking-[0.12em] text-[var(--ink-2)]">
        {RECOMMENDATION_LABEL[value] ?? value}
      </span>
    </span>
  );
};

/* ── Empty state ────────────────────────────────────────────────────── */

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="max-w-[60ch] py-2 text-[13.5px] leading-relaxed text-[var(--ink-3)]">{children}</p>
);

/** A row of figures, the way a research note leads a section. */
export const StatRow = ({
  items,
}: {
  items: { label: string; value: ReactNode; hint?: string }[];
}) => (
  <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
    {items.map((item) => (
      <div key={item.label}>
        <Eyebrow>{item.label}</Eyebrow>
        <p className="mt-2 text-[22px] font-medium leading-none tracking-[-0.02em] text-[var(--ink-1)]">
          <Figure>{item.value}</Figure>
        </p>
        {item.hint && <p className="mt-1.5 text-[12px] text-[var(--ink-3)]">{item.hint}</p>}
      </div>
    ))}
  </div>
);

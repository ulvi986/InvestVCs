// Financial analysis — deterministic health scoring over the founder's
// financial snapshot, plus an agent that interprets it.
//
// `computeFinancialHealthScore` is the scoring rule that previously lived
// inline in `OverallSummary.tsx`; it is now shared so the dashboard and the
// agent cannot drift apart.


/** Snapshot fields this module reads. Mirrors `FinancialSnapshot`. */
export interface FinancialSnapshotLike {
  revenue?: { total?: number };
  expenses?: { total?: number };
  cashFlow?: { endingCash?: number; monthlyBurnRate?: number; runway?: number };
  customerMetrics?: {
    churnRate?: number;      // fraction, 0..1
    grossMargin?: number;    // fraction, 0..1
    cac?: number;
    cltv?: number;
    arpu?: number;
    activeUsers?: number;
  };
  profitability?: { roi?: number; cagr?: number; growthRate?: number };
}

const finite = (value: unknown): number | null => {
  const n = Number(value);
  return isFinite(n) && !isNaN(n) ? n : null;
};

/**
 * 0-100 financial health score. Profitability 30, runway 25, churn 20,
 * gross margin 25. Components with no data score 0 rather than a default,
 * so an empty snapshot cannot look healthy.
 */
export function computeFinancialHealthScore(snapshot: FinancialSnapshotLike | null | undefined): number {
  if (!snapshot) return 0;
  const revenue = finite(snapshot.revenue?.total) ?? 0;
  const expenses = finite(snapshot.expenses?.total) ?? 0;
  const runway = finite(snapshot.cashFlow?.runway);
  const churn = finite(snapshot.customerMetrics?.churnRate);
  const margin = finite(snapshot.customerMetrics?.grossMargin);

  let score = 0;
  if (revenue > expenses) score += 30;
  else if (revenue > 0) score += 15;

  if (runway !== null) {
    if (runway > 12) score += 25;
    else if (runway > 6) score += 15;
    else if (runway > 0) score += 5;
  }

  if (churn !== null) {
    if (churn < 0.05) score += 20;
    else if (churn < 0.1) score += 10;
  }

  if (margin !== null) {
    if (margin > 0.6) score += 25;
    else if (margin > 0.3) score += 15;
    else if (margin > 0) score += 5;
  }

  return Math.min(score, 100);
}

/** Which health inputs the snapshot actually contains. */
export function financialCoverage(snapshot: FinancialSnapshotLike | null | undefined): {
  present: string[];
  missing: string[];
  ratio: number;
} {
  const checks: [string, boolean][] = [
    ["revenue", finite(snapshot?.revenue?.total) !== null],
    ["expenses", finite(snapshot?.expenses?.total) !== null],
    ["runway", finite(snapshot?.cashFlow?.runway) !== null],
    ["churn", finite(snapshot?.customerMetrics?.churnRate) !== null],
    ["grossMargin", finite(snapshot?.customerMetrics?.grossMargin) !== null],
    ["cac", finite(snapshot?.customerMetrics?.cac) !== null],
    ["cltv", finite(snapshot?.customerMetrics?.cltv) !== null],
  ];
  const present = checks.filter(([, ok]) => ok).map(([k]) => k);
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => k);
  return { present, missing, ratio: present.length / checks.length };
}

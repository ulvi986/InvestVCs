// Evidence-quality helpers for display.
//
// Confidence *scoring* is done by the Python service, which owns the model
// outputs and the registry ceilings (`ai/app/confidence.py`). These two
// functions exist only so the UI can describe an evidence set it already has
// in hand, without a round trip.

import type { EvidenceRef, SourceType } from "./types";

/** How much a claim is worth, by where it came from. */
export const SOURCE_WEIGHT: Record<SourceType, number> = {
  provided: 1,
  derived: 0.9,
  inferred: 0.4,
  absent: 0,
};

/**
 * 0..1 quality of an evidence set. An empty set scores 0 — silence is not the
 * same as certainty.
 */
export function evidenceQuality(evidence: EvidenceRef[] | undefined | null): number {
  if (!evidence?.length) return 0;
  const total = evidence.reduce((sum, item) => {
    const weight = SOURCE_WEIGHT[item.sourceType] ?? 0.4;
    const claimConfidence = Math.min(1, Math.max(0, Number(item.confidence)));
    return sum + weight * (isFinite(claimConfidence) ? claimConfidence : 0.5);
  }, 0);
  return Math.round((total / evidence.length) * 100) / 100;
}

/** Share of the evidence that is model inference rather than provided data. */
export function inferenceShare(evidence: EvidenceRef[] | undefined | null): number {
  if (!evidence?.length) return 1;
  const inferred = evidence.filter(
    (item) => item.sourceType === "inferred" || item.sourceType === "absent",
  ).length;
  return Math.round((inferred / evidence.length) * 100) / 100;
}

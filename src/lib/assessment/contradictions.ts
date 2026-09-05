// Contradiction detection.
//
// Runs the rule set over the signal state after every answer. The result is
// never used to silently adjust a number: an unresolved high-severity
// contradiction marks the whole valuation provisional, and the founder is
// asked, in the interview, to settle it.

import { CONTRADICTION_RULES } from "./config/contradictions";
import { answerLabel, collectSignals } from "./engine";
import type { AnswerMap, Contradiction, Resolution } from "./types";

export function detectContradictions(answers: AnswerMap): Contradiction[] {
  const signals = collectSignals(answers);
  const found: Contradiction[] = [];

  for (const rule of CONTRADICTION_RULES) {
    let hit: ReturnType<typeof rule.detect>;
    try {
      hit = rule.detect({
        signals,
        answers,
        answerLabel: (questionId) => answerLabel(questionId, answers),
      });
    } catch {
      // A rule that throws on unexpected data must not take the interview
      // down with it.
      continue;
    }
    if (!hit) continue;

    found.push({
      ruleId: rule.id,
      title: rule.title,
      message: hit.message,
      severity: rule.severity,
      questionIds: hit.questionIds,
      clarification: hit.clarification,
      affects: rule.affects,
      penalty: rule.penalty,
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return found.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Contradictions the founder has not yet answered for. */
export const unresolved = (
  contradictions: Contradiction[],
  resolutions: Record<string, Resolution>,
): Contradiction[] => contradictions.filter((c) => !resolutions[c.ruleId]);

/**
 * The next contradiction to interrupt the interview for. Only high-severity
 * ones interrupt; the rest are raised on the results page, where they can be
 * read in context rather than blocking progress.
 */
export const blockingContradiction = (
  contradictions: Contradiction[],
  resolutions: Record<string, Resolution>,
): Contradiction | null =>
  unresolved(contradictions, resolutions).find((c) => c.severity === "high") ?? null;

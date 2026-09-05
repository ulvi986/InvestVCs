// Berkus Method — pre-revenue valuation from five qualitative components.
//
// The constants below are the single source of truth: both the manual
// calculator (`src/components/BerkusMethod.tsx`) and the Berkus agent import
// them, so the agent can never produce a number the calculator disagrees with
// for the same inputs.


export const BERKUS_SCORE_TO_VALUE: Record<number, number> = {
  0: 0, 1: 70000, 2: 150000, 3: 250000, 4: 400000, 5: 500000,
};

export const BERKUS_COMPONENT_KEYS = [
  "sound_idea", "prototype", "team", "strategic", "traction",
] as const;

export type BerkusComponentKey = (typeof BERKUS_COMPONENT_KEYS)[number];

/** Highest attainable Berkus valuation (5 components × $500k). */
export const BERKUS_MAX = BERKUS_COMPONENT_KEYS.length * BERKUS_SCORE_TO_VALUE[5];

/** Sum the component values. `null` counts as unanswered (0), as in the UI. */
export function computeBerkus(scores: (number | null)[]): number {
  return scores.reduce<number>(
    (total, score) => total + (score !== null && score !== undefined ? BERKUS_SCORE_TO_VALUE[score] ?? 0 : 0),
    0,
  );
}

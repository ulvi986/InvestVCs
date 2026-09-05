// Technology / Commercial / Funding Readiness Levels (TRL, CRL, FRL).
//
// The level-derivation rules were previously implemented twice — once in
// `ReadinessLevel.tsx` and again, with the criteria counts hardcoded, in
// `OverallSummary.tsx`. Both now import from here.


export type ReadinessPrefix = "TRL" | "CRL" | "FRL";

export const READINESS_MAX_LEVEL = 9;

/** [mandatory, supportive] criteria counts per level, level 1 first. */
export const READINESS_CRITERIA: Record<ReadinessPrefix, [number, number][]> = {
  TRL: [[1, 2], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1]],
  CRL: [[1, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1]],
  FRL: [[1, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1]],
};

export type ReadinessAnswers = Record<string, boolean>;

export const readinessKey = (prefix: string, level: number, type: "M" | "S", index: number) =>
  `${prefix}-${level}-${type}-${index}`;

/** True when every mandatory criterion of `level` is checked. */
export function allMandatoryMet(answers: ReadinessAnswers, prefix: string, level: number, mandatoryCount: number): boolean {
  for (let i = 0; i < mandatoryCount; i++) {
    if (answers?.[readinessKey(prefix, level, "M", i)] !== true) return false;
  }
  return true;
}

/**
 * The attained level: the highest L where levels 1..L all have their mandatory
 * criteria met. Progression stops at the first incomplete level — a company
 * cannot skip ahead by answering a later level.
 */
export function computeReadinessLevel(
  answers: ReadinessAnswers,
  prefix: ReadinessPrefix | string,
  criteria: [number, number][] = READINESS_CRITERIA[prefix as ReadinessPrefix] ?? READINESS_CRITERIA.TRL,
): number {
  let finalLevel = 0;
  for (let level = 1; level <= criteria.length; level++) {
    const [mandatoryCount] = criteria[level - 1] ?? [2, 1];
    if (allMandatoryMet(answers, prefix, level, mandatoryCount)) finalLevel = level;
    else break;
  }
  return finalLevel;
}

/** Highest level the UI should leave open for editing. */
export function computeMaxUnlockedLevel(
  answers: ReadinessAnswers,
  prefix: ReadinessPrefix | string,
  finalLevel: number,
  criteria: [number, number][] = READINESS_CRITERIA[prefix as ReadinessPrefix] ?? READINESS_CRITERIA.TRL,
): number {
  let maxUnlocked = finalLevel;
  for (let i = finalLevel; i < criteria.length; i++) {
    maxUnlocked = i;
    const [mandatoryCount] = criteria[i] ?? [2, 1];
    if (!allMandatoryMet(answers, prefix, i + 1, mandatoryCount)) break;
  }
  return Math.min(maxUnlocked, criteria.length - 1);
}

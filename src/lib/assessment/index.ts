// Public surface of the assessment system.
//
// The UI imports from here and nowhere deeper, so the internal split between
// engine, contradiction layer and methodology configs stays free to move.

export * from "./types";
export {
  CONFIDENCE_CEILING,
  NEUTRAL,
  answerLabel,
  applicableQuestions,
  collectSignals,
  factorLabel,
  isApplicable,
  nextQuestion,
  overallEvidenceQuality,
  probeConsistency,
  progress,
  questionQueue,
  scoreAnswer,
  scoreFactors,
  shrink,
  stageFromSignals,
  type Progress,
  type ScoredAnswer,
} from "./engine";
export { blockingContradiction, detectContradictions, unresolved } from "./contradictions";
export {
  MINIMUM_COVERAGE,
  blend,
  evaluate,
  questionPrompt,
  runMethodologies,
  type Blend,
} from "./valuation";
export {
  METHODOLOGIES,
  METHODOLOGY_BY_ID,
  SECTOR_MEDIAN_PREMONEY,
  SECTOR_REVENUE_MULTIPLE,
  STAGE_MULTIPLIER,
  comparableMedian,
  roundSensible,
  spreadFrom,
} from "./config/methodologies";
export {
  FACTORS,
  FACTOR_BY_KEY,
  FACTOR_KEYS,
  SECTIONS,
  SECTION_BY_KEY,
  STAGES,
  STAGE_BY_KEY,
  factorWeight,
  stageRank,
} from "./config/factors";
export { QUESTIONS, QUESTION_BY_ID } from "./config/questions";
export { CONTRADICTION_RULES } from "./config/contradictions";
export { loadAssessmentSession, toAnalystInputs, type AnalystInputs } from "./bridge";

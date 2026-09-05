// Assessment session state.
//
// The interview is long enough that losing it to a refresh would be a real
// failure, so the session is written to local storage on every answer and
// rehydrated on mount. The derived result is recomputed from the answers
// rather than stored — there is one source of truth, and it is what the
// founder said.

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  blockingContradiction,
  collectSignals,
  detectContradictions,
  evaluate,
  nextQuestion,
  progress,
  QUESTION_BY_ID,
  type Answer,
  type AssessmentResult,
  type AssessmentSession,
  type Contradiction,
  type Progress,
  type Question,
  type Resolution,
} from "@/lib/assessment";

const STORAGE_KEY = "investvcs.assessment.v1";

const newSession = (): AssessmentSession => ({
  id: `sess_${Date.now().toString(36)}`,
  startupName: "",
  answers: {},
  resolutions: {},
  history: [],
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedAt: null,
});

function load(): AssessmentSession {
  if (typeof window === "undefined") return newSession();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return newSession();
    const parsed = JSON.parse(raw) as Partial<AssessmentSession>;
    if (!parsed || typeof parsed !== "object" || !parsed.answers) return newSession();
    return { ...newSession(), ...parsed, answers: parsed.answers ?? {} };
  } catch {
    return newSession();
  }
}

function save(session: AssessmentSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // A full or disabled store must not break the interview.
  }
}

export interface UseAssessment {
  session: AssessmentSession;
  /** The question to put next, or null when the interview is exhausted. */
  current: Question | null;
  progress: Progress;
  contradictions: Contradiction[];
  /** A high-severity contradiction that should interrupt before the next question. */
  blocking: Contradiction | null;
  result: AssessmentResult;
  /** True once every applicable question has an answer. */
  finished: boolean;
  answer: (questionId: string, value: Omit<Answer, "questionId" | "answeredAt">) => void;
  back: () => void;
  canGoBack: boolean;
  resolve: (ruleId: string, outcome: Resolution["outcome"], note?: string) => void;
  reviseAnswer: (questionId: string) => void;
  setStartupName: (name: string) => void;
  complete: () => void;
  reset: () => void;
}

export function useAssessment(): UseAssessment {
  const [session, setSession] = useState<AssessmentSession>(load);
  /** Set when the founder steps back to revisit a specific question. */
  const [revisiting, setRevisiting] = useState<string | null>(null);

  useEffect(() => {
    save(session);
  }, [session]);

  const signals = useMemo(() => collectSignals(session.answers), [session.answers]);
  const contradictions = useMemo(() => detectContradictions(session.answers), [session.answers]);
  const blocking = useMemo(
    () => blockingContradiction(contradictions, session.resolutions),
    [contradictions, session.resolutions],
  );

  const natural = useMemo(() => nextQuestion(session.answers, signals), [session.answers, signals]);
  // A revisited question is served again even though it already has an answer.
  const current = useMemo(
    () => (revisiting ? QUESTION_BY_ID[revisiting] ?? natural : natural),
    [revisiting, natural],
  );

  const result = useMemo(
    () => evaluate(session.answers, session.resolutions),
    [session.answers, session.resolutions],
  );

  const answer = useCallback<UseAssessment["answer"]>((questionId, value) => {
    setRevisiting(null);
    setSession((previous) => ({
      ...previous,
      answers: {
        ...previous.answers,
        [questionId]: { questionId, ...value, answeredAt: new Date().toISOString() },
      },
      history: previous.history[previous.history.length - 1] === questionId
        ? previous.history
        : [...previous.history, questionId],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const back = useCallback(() => {
    setRevisiting(null);
    setSession((previous) => {
      const history = [...previous.history];
      const last = history.pop();
      if (!last) return previous;
      const answers = { ...previous.answers };
      delete answers[last];
      return { ...previous, answers, history, updatedAt: new Date().toISOString() };
    });
  }, []);

  const resolve = useCallback<UseAssessment["resolve"]>((ruleId, outcome, note) => {
    setSession((previous) => ({
      ...previous,
      resolutions: {
        ...previous.resolutions,
        [ruleId]: { ruleId, outcome, note, resolvedAt: new Date().toISOString() },
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  /** Drop one answer and put that question back in front of the founder. */
  const reviseAnswer = useCallback((questionId: string) => {
    setSession((previous) => {
      const answers = { ...previous.answers };
      delete answers[questionId];
      return {
        ...previous,
        answers,
        history: previous.history.filter((id) => id !== questionId),
        completedAt: null,
        updatedAt: new Date().toISOString(),
      };
    });
    setRevisiting(questionId);
  }, []);

  const setStartupName = useCallback((startupName: string) => {
    setSession((previous) => ({ ...previous, startupName, updatedAt: new Date().toISOString() }));
  }, []);

  const complete = useCallback(() => {
    setSession((previous) => ({ ...previous, completedAt: new Date().toISOString() }));
  }, []);

  const reset = useCallback(() => {
    const fresh = newSession();
    setRevisiting(null);
    setSession(fresh);
    save(fresh);
  }, []);

  return {
    session,
    current,
    progress: progress(session.answers, signals),
    contradictions,
    blocking,
    result,
    finished: current === null,
    answer,
    back,
    canGoBack: session.history.length > 0,
    resolve,
    reviseAnswer,
    setStartupName,
    complete,
    reset,
  };
}

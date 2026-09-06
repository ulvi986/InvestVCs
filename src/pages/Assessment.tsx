// The interview.
//
// One question at a time, a rail showing where we are, and an interruption
// whenever two answers cannot both be true. The founder never sees a score
// while answering — the whole design depends on them describing what happened
// rather than steering toward a number.

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

import PageShell from "@/components/layout/PageShell";
import QuestionCard from "@/components/assessment/QuestionCard";
import SectionRail from "@/components/assessment/SectionRail";
import ContradictionGate from "@/components/assessment/ContradictionGate";
import { useAssessment } from "@/hooks/useAssessment";
import { MINIMUM_COVERAGE } from "@/lib/assessment";

const Assessment = () => {
  const navigate = useNavigate();
  const {
    session, current, progress, blocking, result, finished,
    answer, back, canGoBack, resolve, reviseAnswer, reset,
  } = useAssessment();

  const answeredEnough = result.coverage >= MINIMUM_COVERAGE;
  const questionNumber = progress.answered + 1;

  const body = useMemo(() => {
    if (blocking) {
      return (
        <ContradictionGate
          contradiction={blocking}
          onRevise={reviseAnswer}
          onResolve={(outcome, note) => resolve(blocking.ruleId, outcome, note)}
        />
      );
    }

    if (current) {
      return (
        <QuestionCard
          question={current}
          existing={session.answers[current.id]}
          index={questionNumber}
          onAnswer={(value) => answer(current.id, value)}
        />
      );
    }

    return (
      <section className="enter-up">
        <p className="kicker">Interview complete</p>
        <h2 className="mt-4 max-w-[26ch] text-[30px] font-medium leading-[1.2] tracking-[-0.025em] text-[var(--ink-1)]">
          That is everything worth asking about {session.startupName || "this company"}.
        </h2>
        <p className="measure mt-4 text-[15px] leading-[1.7] text-[var(--ink-2)]">
          {progress.answered} answers. They go to the analyst agents now — the interview does not grade you
          itself. The agents read what you said, apply the methodologies this company's stage supports,
          argue with each other about it, and reach the conclusion.
        </p>
        <button
          type="button"
          onClick={() => navigate("/workflow?run=1")}
          className="mt-8 inline-flex items-center gap-2 bg-[var(--accent-ink)] px-5 py-2.5 text-[13px] font-medium text-white"
        >
          Run the analysis
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </section>
    );
  }, [blocking, current, session, questionNumber, progress.answered, answer, resolve, reviseAnswer, navigate]);

  return (
    <PageShell
      kicker="Evidence-based assessment"
      title="An analyst is interviewing your startup"
      standfirst="Structured questions about what has actually happened. Your answers are converted into the variables each valuation methodology needs — you are never asked to score yourself."
      wide
    >
      <div className="grid gap-12 lg:grid-cols-[1fr_230px]">
        <div className="min-w-0 order-2 lg:order-1">
          {/* Overall progress. The only figure visible during the interview,
              and it is about the interview, not about the company. */}
          <div className="mb-10">
            <div className="flex items-baseline justify-between gap-4">
              <span className="kicker">
                {Math.round(progress.ratio * 100)}% answered
              </span>
              <span className="text-[11px] tabular-nums text-[var(--ink-3)]">
                {progress.answered} of {progress.total}
              </span>
            </div>
            <span className="analyst-bar mt-2.5 block">
              <span style={{ width: `${progress.ratio * 100}%` }} />
            </span>
          </div>

          {body}

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--rule)] pt-5">
            <button
              type="button"
              onClick={back}
              disabled={!canGoBack || Boolean(blocking)}
              className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)] disabled:opacity-30 disabled:hover:text-[var(--ink-3)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Previous question
            </button>

            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear every answer and start the interview again?")) reset();
                }}
                className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Start over
              </button>

              {answeredEnough && !finished && (
                <Link
                  to="/workflow?run=1"
                  className="inline-flex items-center gap-2 text-[13px] text-[var(--accent-ink)] transition-opacity hover:opacity-70"
                >
                  Analyse what I have so far
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </div>
          </div>
        </div>

        <aside className="order-1 lg:order-2 lg:border-l lg:border-[var(--rule)] lg:pl-8">
          <SectionRail progress={progress} currentSection={current?.section ?? null} />
        </aside>
      </div>
    </PageShell>
  );
};

export default Assessment;

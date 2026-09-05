// The results surface.
//
// Ordered the way a reader actually needs it: the answer first, then the
// range it sits in, then the methods that produced it, then the evidence
// underneath them, and only then the machinery. Every figure on the page
// opens onto the answers that made it.

import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";

import PageShell from "@/components/layout/PageShell";
import { Panel } from "@/components/analyst/primitives";
import ScoreHero from "@/components/results/ScoreHero";
import ValuationRange from "@/components/results/ValuationRange";
import MethodologyComparison from "@/components/results/MethodologyComparison";
import FactorRadar from "@/components/results/FactorRadar";
import FactorBreakdown from "@/components/results/FactorBreakdown";
import MethodologyDetail from "@/components/results/MethodologyDetail";
import MethodPipeline from "@/components/results/MethodPipeline";
import { ContradictionList, GapList, KeyDrivers, RiskList } from "@/components/results/Panels";
import { useAssessment } from "@/hooks/useAssessment";
import { MINIMUM_COVERAGE, STAGE_BY_KEY } from "@/lib/assessment";

const AssessmentResults = () => {
  const navigate = useNavigate();
  const { session, result, progress, reviseAnswer, reset } = useAssessment();

  const answered = progress.answered;
  const started = answered > 0;

  const revisit = (questionId: string) => {
    reviseAnswer(questionId);
    navigate("/assessment");
  };

  if (!started) {
    return (
      <PageShell
        kicker="Assessment"
        title="Nothing to show yet"
        standfirst="The results here are built entirely from the interview. Answer the questions and this page fills in as you go."
      >
        <button
          type="button"
          onClick={() => navigate("/assessment")}
          className="inline-flex items-center gap-2 bg-[var(--accent-ink)] px-5 py-2.5 text-[13px] font-medium text-white"
        >
          Start the interview
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </PageShell>
    );
  }

  const stage = STAGE_BY_KEY[result.stage];
  const thin = result.coverage < MINIMUM_COVERAGE;

  return (
    <PageShell
      kicker={`${stage?.label ?? result.stage} stage · ${answered} answers`}
      title={session.startupName ? `${session.startupName}: assessment` : "Startup assessment"}
      standfirst="An analytical estimate derived from your answers and the published assumptions of each methodology. It is not a market price, and not an offer anyone has made."
      wide
      action={
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/assessment")}
            className="inline-flex items-center gap-2 text-[13px] text-[var(--accent-ink)] transition-opacity hover:opacity-70"
          >
            {result.gaps.length ? "Continue the interview" : "Review my answers"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear every answer and start again?")) {
                reset();
                navigate("/assessment");
              }
            }}
            className="inline-flex items-center gap-2 text-[12px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Start over
          </button>
        </div>
      }
    >
      {thin && (
        <div className="mb-10 border-l-2 border-[var(--rule-strong)] bg-[var(--band)] p-4">
          <p className="max-w-[70ch] text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            Only {Math.round(result.coverage * 100)}% of the interview is answered, which is below the floor where
            any methodology will produce a figure. The factor scores below are live; the valuation appears once
            there is enough to base it on.
          </p>
        </div>
      )}

      <div className="space-y-0">
        <section className="analyst-section">
          <ScoreHero result={result} name={session.startupName} />
        </section>

        <Panel
          title="Valuation range"
          subtitle="Three scenarios on one scale, with each methodology's own answer marked underneath. The width of the band is the honest part."
        >
          <ValuationRange result={result} />
        </Panel>

        <Panel
          title="Methodology comparison"
          subtitle="What each method concluded, how much of the blend it earned, and why the ones that did not run were left out."
        >
          <MethodologyComparison result={result} />
        </Panel>

        <Panel
          title="Score breakdown"
          subtitle="Nine derived factors. Score and confidence are shown as separate shapes on purpose — a high score on a thin evidence base is a different finding from a high score on a thick one."
        >
          <FactorRadar factors={result.factors} />
        </Panel>

        <Panel
          title="Why this score?"
          subtitle="Open any factor for the answers that produced it, the evidence class of each, and what would firm it up. The tick behind each bar marks the raw reading before the evidence haircut."
        >
          <FactorBreakdown factors={result.factors} />
        </Panel>

        <Panel title="Key drivers">
          <KeyDrivers strengths={result.strengths} weaknesses={result.weaknesses} />
        </Panel>

        <Panel
          title="Method by method"
          subtitle="Each methodology's own components, the figure each contributed, and the assumptions and blind spots that come with it."
        >
          <div className="border-t border-[var(--rule)]">
            {result.methodologies.map((methodology) => (
              <MethodologyDetail key={methodology.id} methodology={methodology} />
            ))}
          </div>
        </Panel>

        <Panel
          title="How this was produced"
          subtitle="Seven stages between your answers and the range. Select any one to see what it did with what it was handed."
        >
          <MethodPipeline result={result} answered={answered} />
        </Panel>

        <Panel
          title="Inconsistencies"
          subtitle="Where two answers cannot both be true. These are not corrected silently — they cut the confidence of the factors they touch until they are settled."
        >
          <ContradictionList
            contradictions={result.contradictions}
            resolutions={session.resolutions}
            onRevisit={revisit}
          />
        </Panel>

        <Panel title="Risk indicators" subtitle="Read directly off specific answers, not inferred from the scores.">
          <RiskList risks={result.risks} />
        </Panel>

        <Panel
          title="Missing information"
          subtitle="The unanswered questions that would move confidence most, ranked by how much."
        >
          <GapList gaps={result.gaps} onAnswer={() => navigate("/assessment")} />
        </Panel>

        <section className="analyst-section">
          <p className="kicker">What this is, and what it is not</p>
          <div className="mt-4 grid gap-8 sm:grid-cols-2">
            <p className="text-[13px] leading-[1.75] text-[var(--ink-2)]">
              Every figure here is an <span className="text-[var(--ink-1)]">analytical estimate</span> derived from
              answers you gave about your own company, scored against published methodologies whose assumptions are
              stated beside each result. The system distinguishes throughout between the evidence, the
              interpretation, the score, the method and the estimate — and reports its confidence in each rather
              than presenting any of them as settled.
            </p>
            <p className="text-[13px] leading-[1.75] text-[var(--ink-3)]">
              It is not a market price. No investor has quoted it, no comparable transaction has been verified, and
              nothing you entered has been independently checked. Ranges are rounded to two significant figures
              because the inputs cannot support more precision than that. Treat the output as a structured second
              opinion to argue with — the disagreements between the methods are more informative than their
              average.
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
};

export default AssessmentResults;

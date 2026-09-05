// The full-width investment report.
//
// The workflow's right-hand panel has to fit this into 470px, so there it is
// prose. Given a page, the same run reads as an investment memo: the verdict
// and what it is worth up top, then where the number came from, then the
// dimensions, the risks plotted rather than listed, and — deliberately last
// rather than buried — what the analysis could not establish.
//
// Nothing here re-derives anything. Every figure is read straight off the
// session the agents produced.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Copy } from "lucide-react";

import PageShell from "@/components/layout/PageShell";
import { Panel } from "@/components/analyst/primitives";
import ReportHero from "@/components/analyst/report/ReportHero";
import ValuationBridge from "@/components/analyst/report/ValuationBridge";
import DimensionChart from "@/components/analyst/report/DimensionChart";
import RiskMatrix from "@/components/analyst/report/RiskMatrix";
import {
  ConfidencePanel, CriticSummary, Disagreements, MethodologyMap, OpenQuestions, ScenarioBand,
} from "@/components/analyst/report/ReportSections";

import { useAuth } from "@/context/AuthContext";
import { listSessions, loadSession } from "@/lib/analyst/persistence";
import { thesisToMarkdown } from "@/lib/analyst/report";
import type { AnalysisSession } from "@/lib/analyst/types";

const AnalysisReport = () => {
  const { sessionId } = useParams();
  const [search] = useSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");
  const [copied, setCopied] = useState(false);

  const wanted = sessionId ?? search.get("session") ?? null;

  useEffect(() => {
    let cancelled = false;

    const pick = async (): Promise<AnalysisSession | null> => {
      if (wanted) return loadSession(wanted);
      if (!user) return null;
      // No id given: the most recent completed run is what the reader means.
      const recent = await listSessions(user.id, 10);
      return recent.find((entry) => entry.thesis) ?? recent[0] ?? null;
    };

    pick()
      .then((found) => {
        if (cancelled) return;
        setSession(found);
        setState(found?.thesis ? "ready" : "empty");
      })
      .catch(() => {
        if (!cancelled) setState("empty");
      });

    return () => { cancelled = true; };
  }, [wanted, user]);

  const thesis = session?.thesis ?? null;

  const copyMarkdown = async () => {
    if (!session || !thesis) return;
    const markdown = thesisToMarkdown({
      startupName: session.startupName,
      profile: session.profile,
      thesis,
      results: session.results,
      critique: session.critique,
      disagreements: session.disagreements,
    });
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // A refused clipboard is not worth an error state.
    }
  };

  const incomplete = useMemo(
    () => thesis?.incompleteAnalysis?.filter((entry) => entry.reason) ?? [],
    [thesis],
  );

  if (state === "loading") {
    return (
      <PageShell kicker="Investment report" title="Loading the run…">
        <p className="text-[13px] text-[var(--ink-3)]">Reading the session the agents produced.</p>
      </PageShell>
    );
  }

  if (state === "empty" || !session || !thesis) {
    return (
      <PageShell
        kicker="Investment report"
        title="No finished analysis yet"
        standfirst="A report appears here once a workflow run completes. Start one, and this page fills in from the session the agents produce."
      >
        <Link
          to="/workflow"
          className="inline-flex items-center gap-2 bg-[var(--accent-ink)] px-5 py-2.5 text-[13px] font-medium text-white"
        >
          Open the workflow
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      kicker={`Investment report · ${new Date(session.completedAt ?? session.updatedAt).toLocaleDateString()}`}
      title={session.startupName || "Untitled startup"}
      standfirst="The recommendation, what it is worth, and the evidence behind both. Every figure is read off the run the agents produced."
      wide
      action={
        <div className="flex flex-col items-end gap-2">
          <Link
            to={`/workflow?session=${session.id}`}
            className="inline-flex items-center gap-2 text-[13px] text-[var(--accent-ink)] transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to the workflow
          </Link>
          <button
            type="button"
            onClick={copyMarkdown}
            className="inline-flex items-center gap-2 text-[12px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
          >
            {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
            {copied ? "Copied" : "Copy as Markdown"}
          </button>
        </div>
      }
    >
      <div className="space-y-0">
        <section className="analyst-section">
          <ReportHero thesis={thesis} reconciled={session.reconciled} startupName={session.startupName} />
        </section>

        <Panel title="The bet" subtitle="What the analyst thinks this is, stated as a position rather than a summary.">
          <p className="measure text-[14px] leading-[1.8] text-[var(--ink-1)]">{thesis.thesis}</p>
          <p className="measure mt-5 text-[13px] leading-[1.75] text-[var(--ink-2)]">
            {thesis.recommendationReasoning}
          </p>
        </Panel>

        <Panel
          title="Where the number came from"
          subtitle="Each methodology on one scale, with its own uncertainty band and the weight it earned. The reconciled band sits underneath, on the same axis."
        >
          <ValuationBridge thesis={thesis} reconciled={session.reconciled} />
        </Panel>

        <Panel
          title="Scenarios"
          subtitle="Probability drawn as width. What has to be true for each one is listed underneath it."
        >
          <ScenarioBand bear={thesis.bearCase} base={thesis.baseCase} bull={thesis.bullCase} />
        </Panel>

        <Panel
          title="Dimension scores"
          subtitle="Score and confidence as separate shapes, on purpose — a strong reading on a thin evidence base is a different finding from a strong reading on a thick one."
        >
          <DimensionChart sections={thesis.sections} />
        </Panel>

        <Panel
          title="Risk"
          subtitle="Plotted by severity against likelihood, because a list of forty risks makes every one of them look equally urgent."
        >
          <RiskMatrix risks={thesis.risks} />
        </Panel>

        <Panel
          title="Where the methodologies disagree"
          subtitle="A spread between two methods is more informative than their average, so it is reported rather than smoothed."
        >
          <Disagreements items={session.disagreements ?? []} />
        </Panel>

        <Panel
          title="The critic's pass"
          subtitle="A separate agent whose only job is to attack the conclusions the others reached."
        >
          <CriticSummary critique={session.critique} />
        </Panel>

        <Panel
          title="Why these methodologies"
          subtitle="What the analyst chose to run on this company, and what it refused to run — with its reasoning for each."
        >
          <MethodologyMap entries={thesis.methodologySelectionExplanation} />
        </Panel>

        <Panel
          title="Confidence"
          subtitle={`Reported as ${Math.round((thesis.confidence.overall ?? 0) * 100)}% overall. What that rests on, and what holds it down.`}
        >
          <ConfidencePanel thesis={thesis} />
        </Panel>

        <Panel
          title="Open questions for the founder"
          subtitle="What the analysis could not establish. Answering these is what moves the confidence figure, not re-running the same material."
        >
          <OpenQuestions gaps={thesis.missingInformation} />
        </Panel>

        {incomplete.length > 0 && (
          <Panel title="Incomplete in this run">
            <ul className="space-y-2">
              {incomplete.map((entry) => (
                <li key={entry.methodologyId} className="text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                  <span className="text-[var(--ink-2)]">{entry.methodologyId}</span> — {entry.reason}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <section className="analyst-section">
          <p className="kicker">What this is</p>
          <p className="measure mt-4 text-[13px] leading-[1.75] text-[var(--ink-3)]">
            Generated by AI from the material supplied. The figures are not verified against audited records, no
            investor has quoted them, and every conclusion should be checked against primary sources before capital
            is committed. Where the analysis was working from founder statements rather than documents, it says so
            in the dimension it affects.
          </p>
        </section>
      </div>
    </PageShell>
  );
};

export default AnalysisReport;

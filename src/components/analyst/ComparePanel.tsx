// Startup A vs Startup B, over two completed analyses.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitCompare, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { AnalysisSession } from "@/lib/analyst/types";
import { listSessions, loadSession } from "@/lib/analyst/persistence";
import { compareStartups, type ComparisonResult } from "@/lib/analyst/service";
import {
  ConfidenceMeter, Empty, Eyebrow, Figure, Panel, RecommendationBadge, Tag, formatUsd,
} from "./primitives";

/** The slice of a session worth sending to the comparison agent. */
function digestSession(session: AnalysisSession) {
  return {
    name: session.startupName,
    stage: session.profile?.stage ?? null,
    industries: session.profile?.industries ?? [],
    oneLiner: session.profile?.oneLiner ?? "",
    recommendation: session.thesis?.recommendation ?? null,
    executiveSummary: session.thesis?.executiveSummary ?? "",
    thesis: session.thesis?.thesis ?? "",
    reconciledValuation: session.reconciled?.range ?? null,
    valuationConfidence: session.reconciled?.confidence ?? null,
    sectionScores: (session.thesis?.sections ?? []).map((section) => ({
      dimension: section.title,
      score10: section.score10,
      confidence: section.confidence,
      narrative: section.narrative,
    })),
    methodologyResults: Object.values(session.results ?? {}).map((result) => ({
      methodology: result.name,
      status: result.status,
      headline: result.headline,
      score10: result.score10 ?? null,
      valuation: result.valuation ?? null,
      confidence: result.confidence,
    })),
    topRisks: (session.thesis?.risks ?? []).slice(0, 6).map((risk) => ({
      title: risk.title, severity: risk.severity, likelihood: risk.likelihood,
    })),
    overallConfidence: session.thesis?.confidence.overall ?? null,
    evidenceQuality: session.thesis?.confidence.evidenceQuality ?? session.profile?.evidenceQuality ?? null,
    coverage: session.thesis?.confidence.coverage ?? null,
    missingInformation: (session.thesis?.missingInformation ?? []).map((gap) => gap.field),
    incompleteAnalysis: session.thesis?.incompleteAnalysis ?? [],
  };
}

export const ComparePanel = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [pair, setPair] = useState<{ a: AnalysisSession; b: AnalysisSession } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listSessions(user.id, 40).then((rows) => {
      if (cancelled) return;
      setSessions(rows.filter((row) => row.status === "completed"));
    });
    return () => { cancelled = true; };
  }, [user]);

  const run = async () => {
    if (!aId || !bId || aId === bId) return;
    setRunning(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([loadSession(aId), loadSession(bId)]);
      if (!a || !b) throw new Error("One of the analyses could not be loaded.");
      setPair({ a, b });
      setResult(await compareStartups(digestSession(a), digestSession(b)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The comparison failed.");
    } finally {
      setRunning(false);
    }
  };

  if (!user) {
    return <Panel title="Compare startups"><Empty>Sign in to compare saved analyses.</Empty></Panel>;
  }

  if (sessions.length < 2) {
    return (
      <Panel title="Compare startups">
        <Empty>
          Two completed analyses are needed to compare. You have {sessions.length}.
        </Empty>
      </Panel>
    );
  }

  const options = (exclude: string) => sessions.filter((session) => session.id !== exclude);

  return (
    <div className="space-y-5">
      <Panel title="Compare startups" subtitle="Run the comparison over two completed analyses.">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Eyebrow>Startup A</Eyebrow>
            <Select value={aId} onValueChange={setAId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select an analysis" /></SelectTrigger>
              <SelectContent>
                {options(bId).map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.startupName} · {new Date(session.createdAt).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="hidden pb-2 text-xs text-muted-foreground sm:block">vs</span>

          <div className="space-y-1.5">
            <Eyebrow>Startup B</Eyebrow>
            <Select value={bId} onValueChange={setBId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select an analysis" /></SelectTrigger>
              <SelectContent>
                {options(aId).map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.startupName} · {new Date(session.createdAt).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="gap-2 rounded-lg" disabled={!aId || !bId || aId === bId || running} onClick={run}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
            Compare
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-[var(--negative)]">{error}</p>}
      </Panel>

      {result && pair && (
        <>
          <Panel
            title="Comparison"
            actions={
              <Tag tone={result.recommendedStartup === "neither" ? "muted" : "accent"}>
                {result.recommendedStartup === "a"
                  ? pair.a.startupName
                  : result.recommendedStartup === "b"
                    ? pair.b.startupName
                    : "Neither"}
              </Tag>
            }
          >
            <p className="text-[15px] font-light leading-relaxed text-foreground/90">{result.summary}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[pair.a, pair.b].map((session, index) => (
                <div key={session.id} className="rounded-xl border border-[var(--rule)] bg-[var(--band)] p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{session.startupName}</p>
                    <Tag tone="muted">{index === 0 ? "A" : "B"}</Tag>
                  </div>
                  {session.thesis && (
                    <div className="mt-2.5">
                      <RecommendationBadge value={session.thesis.recommendation} size="sm" />
                    </div>
                  )}
                  <Figure className="mt-3 block text-lg text-foreground">
                    {formatUsd(session.reconciled?.range.point ?? null)}
                  </Figure>
                  {session.thesis && (
                    <div className="mt-3">
                      <ConfidenceMeter value={session.thesis.confidence.overall} label="Confidence" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {result.dimensions.map((dimension, i) => {
                const total = Math.max(1, dimension.aScore10 + dimension.bScore10);
                const aShare = (dimension.aScore10 / total) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <Figure className={`text-sm ${dimension.winner === "a" ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {dimension.aScore10.toFixed(1)}
                      </Figure>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground/70">{dimension.dimension}</span>
                      <Figure className={`text-sm ${dimension.winner === "b" ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {dimension.bScore10.toFixed(1)}
                      </Figure>
                    </div>
                    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[var(--band)]">
                      <div className="h-full bg-[var(--accent-ink)]" style={{ width: `${aShare}%` }} />
                      <div className="h-full bg-[var(--positive)]" style={{ width: `${100 - aShare}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs font-light leading-relaxed text-muted-foreground">{dimension.reasoning}</p>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Recommendation">
            <p className="text-[15px] font-light leading-relaxed text-foreground/90">{result.recommendation}</p>
            <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">{result.reasoning}</p>

            {result.evidenceQualityNote && (
              <div className="mt-5 rounded-lg border-l-2 border-[var(--caution)] border-y border-r border-[var(--rule)] bg-[var(--band)] p-4">
                <Eyebrow>Evidence quality caveat</Eyebrow>
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">{result.evidenceQualityNote}</p>
              </div>
            )}

            {result.conditions.length > 0 && (
              <div className="mt-5">
                <Eyebrow>What would flip the decision</Eyebrow>
                <ul className="mt-2 space-y-1.5">
                  {result.conditions.map((condition, i) => (
                    <li key={i} className="flex gap-2 text-sm font-light leading-relaxed text-muted-foreground">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 max-w-xs">
              <ConfidenceMeter value={result.confidence} label="Confidence in this comparison" />
            </div>
          </Panel>
        </>
      )}
    </div>
  );
};

export default ComparePanel;

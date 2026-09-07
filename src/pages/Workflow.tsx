// The Workflow workspace.
//
// One screen, no page scroll. The workflow graph holds the middle and nothing
// competes with it; everything else — what you ask for, the company brief, the
// agent roster, the timeline and the finished memo — lives in the panel on the
// right and scrolls there.
//
// The panel and the graph share one selection, so clicking an agent in either
// place opens it in the other. Every visible state comes from the service;
// nothing animates unless a run is genuinely producing it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, History, Maximize2, Minimize2, Play, Square,
} from "lucide-react";

import SiteHeader from "@/components/layout/SiteHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/context/AuthContext";
import { useStartupContext } from "@/context/StartupContext";
import { supabase } from "@/integrations/supabase/client";
import { useInvestmentAnalyst } from "@/hooks/useInvestmentAnalyst";
import { useServiceHealth } from "@/hooks/useServiceHealth";

import type { AnalysisSession, InputBundle, SessionMode } from "@/lib/analyst/types";
import type { GraphNode, WorkflowSpec, WorkflowTemplate } from "@/lib/analyst/graphTypes";
import { graphFromWorkflow, methodologyIdFromNode } from "@/lib/analyst/graphTypes";
import { buildInputBundle, emptyBundle } from "@/lib/analyst/intake";
import { loadAssessmentSession, toAnalystInputs } from "@/lib/assessment";
import { listSessions } from "@/lib/analyst/persistence";
import type { CustomAgent } from "@/lib/analyst/service";
import { AI_SERVICE_URL, fetchWorkflows, isServiceConfigured } from "@/lib/analyst/service";

import AskChat from "@/components/workspace/AskChat";
import CommandBar from "@/components/workspace/CommandBar";
import AgentGraph from "@/components/analyst/AgentGraph";
import AgentRail from "@/components/analyst/AgentRail";
import ApprovalGate from "@/components/analyst/ApprovalGate";
import IntakePanel from "@/components/analyst/IntakePanel";
import InvestmentReport from "@/components/analyst/InvestmentReport";
import ValuationPanel from "@/components/analyst/ValuationPanel";
import MethodologyResults from "@/components/analyst/MethodologyResults";
import CriticPanel from "@/components/analyst/CriticPanel";
import FollowUpPanel from "@/components/analyst/FollowUpPanel";
import CustomAgentPanel, { loadCustomAgents } from "@/components/analyst/CustomAgentPanel";
import StartupSummaryPanel from "@/components/analyst/StartupSummaryPanel";
import { Empty, RecommendationBadge } from "@/components/analyst/primitives";

/** The four things the right panel holds. Anything deeper is a sub-tab. */
const PANELS = [
  { value: "ask", label: "Ask" },
  { value: "company", label: "Company" },
  { value: "agents", label: "Agents" },
  { value: "results", label: "Results" },
];

const askField =
  "w-full rounded-[var(--radius)] border border-[var(--rule-strong)] bg-[var(--page)] px-3 py-2 " +
  "text-[13.5px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)] " +
  "focus:border-[var(--accent-ink)] focus:outline-none";

/** A titled block inside the panel. The rule is the only chrome. */
const Block = ({
  title, action, children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="border-b border-[var(--rule)] px-5 py-6 last:border-b-0">
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
      <p className="kicker">{title}</p>
      {action}
    </div>
    {children}
  </section>
);

const Workflow = () => {
  const { user } = useAuth();
  const { evaluation, financial, readiness, loading: contextLoading } = useStartupContext();
  const { snapshots } = financial;
  const { state, start, cancel, open, respondToApproval, isRunning } = useInvestmentAnalyst();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bundle, setBundle] = useState<InputBundle>(emptyBundle);
  const [mode, setMode] = useState<SessionMode>("autonomous");
  const [chosenIds, setChosenIds] = useState<string[]>([]);
  const [bmc, setBmc] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);
  const [history, setHistory] = useState<AnalysisSession[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingWorkflow, setPendingWorkflow] = useState<WorkflowSpec | null>(null);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>(() => loadCustomAgents());
  const [panel, setPanel] = useState("ask");

  // Deleting an agent must also unselect it. The service skips a methodology id
  // it cannot resolve, so a stale selection would not fail - it would quietly
  // run one agent fewer than the ticked list claims.
  useEffect(() => {
    const live = new Set(customAgents.map((agent) => agent.id));
    setChosenIds((prev) => {
      const kept = prev.filter((id) => !id.startsWith("custom_") || live.has(id));
      return kept.length === prev.length ? prev : kept;
    });
  }, [customAgents]);
  /** Which methodology a one-off re-run is for. Kept out of `mode`/`chosenIds`
   *  so re-running one agent never changes what the Run button does. */
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  /** The graph takes the whole window, panel included. */
  const [expanded, setExpanded] = useState(false);

  const service = useServiceHealth();
  // Only a build with no address is genuinely unusable. A service that is
  // merely not running yet must not disable the controls: the user can start
  // it and press Run again, and the health check recovers on its own.
  const configured = isServiceConfigured();

  /* ── Seed the brief from what the user already entered elsewhere ──── */

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("business_model_canvas")
      .select("canvas_data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.canvas_data) setBmc(data.canvas_data as Record<string, string>);
      });
    return () => { cancelled = true; };
  }, [user]);

  const latestSnapshot = snapshots.length ? snapshots[snapshots.length - 1] : null;

  /**
   * The structured assessment, if the founder has done one.
   *
   * It takes precedence over the manual calculators for the inputs it can
   * supply, because those inputs are derived from evidence-classed answers
   * rather than typed in directly. Where it is silent — no interview, or a
   * methodology it could not run — the calculators still fill the gap.
   */
  const assessment = useMemo(() => {
    const session = loadAssessmentSession();
    return session ? toAnalystInputs(session) : null;
  }, []);

  useEffect(() => {
    if (contextLoading || seeded) return;
    const nonEmpty = <T,>(values: T[] | undefined | null, fallback: T[]) =>
      values && values.length ? values : fallback;

    setBundle((prev) =>
      buildInputBundle({
        startupName: prev.startupName || assessment?.startupName || "",
        // Two narratives are additive, not exclusive: the founder's brief says
        // what they want looked at, the interview says what is true.
        narrative: [prev.narrative, assessment?.narrative].filter(Boolean).join("\n\n"),
        deck: prev.pitchDeckText ? { text: prev.pitchDeckText, fileName: prev.pitchDeckFileName } : null,
        bmc,
        financialSnapshot:
          (latestSnapshot as unknown as Record<string, any> | null) ??
          assessment?.financialSnapshot ??
          null,
        financialHistory: snapshots as unknown as Record<string, any>[],
        manual: {
          berkusAnswers: nonEmpty(assessment?.manual.berkusAnswers, evaluation.berkusAnswers),
          scorecardAnswers: nonEmpty(assessment?.manual.scorecardAnswers, evaluation.scorecardAnswers),
          scorecardMedian: assessment?.manual.scorecardMedian || evaluation.scorecardMedian,
          riskAnswers: nonEmpty(assessment?.manual.riskAnswers, evaluation.riskAnswers),
          vcAnswers: (assessment?.manual.vcAnswers ?? evaluation.vcAnswers) as unknown as Record<string, any>,
          chicagoAnswers: (assessment?.manual.chicagoAnswers ??
            evaluation.chicagoAnswers) as unknown as Record<string, any>,
          trlAnswers: readiness.trlAnswers,
          crlAnswers: readiness.crlAnswers,
          frlAnswers: readiness.frlAnswers,
        },
        gapAnswers: assessment?.gapAnswers ?? null,
      }),
    );
    setSeeded(true);
  }, [contextLoading, seeded, bmc, latestSnapshot, snapshots, evaluation, readiness, assessment]);

  useEffect(() => {
    if (!seeded || !Object.keys(bmc).length) return;
    setBundle((prev) => (Object.keys(prev.bmc).length ? prev : { ...prev, bmc }));
  }, [bmc, seeded]);

  /* ── History, templates, deep links ───────────────────────────────── */

  const refreshHistory = useCallback(() => {
    if (!user) return;
    listSessions(user.id, 10).then(setHistory);
  }, [user]);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);
  useEffect(() => {
    if (state.status === "completed" || state.status === "failed") refreshHistory();
  }, [state.status, refreshHistory]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    fetchWorkflows()
      .then((data) => { if (!cancelled) setTemplates(data.templates); })
      .catch(() => { /* the page works without saved starting points */ });
    return () => { cancelled = true; };
  }, [configured]);

  /**
   * The analysis you were last looking at.
   *
   * A finished run is already in Supabase, but the page only restored one
   * when the URL named it - and starting a run stripped that parameter. So
   * stepping over to the Assessment tab and back came home to a blank
   * workspace with the work sitting in Earlier runs, which reads as having
   * lost it.
   *
   * Kept per user: a shared browser must not open someone else's analysis.
   */
  const lastSessionKey = user ? `investvcs.lastSession.${user.id}` : null;

  const rememberSession = useCallback(
    (sessionId: string | null) => {
      if (!lastSessionKey) return;
      try {
        if (sessionId) localStorage.setItem(lastSessionKey, sessionId);
        else localStorage.removeItem(lastSessionKey);
      } catch {
        // Private mode or blocked storage: the URL still carries the session.
      }
    },
    [lastSessionKey],
  );

  // Once the service has created the session, make it the one that comes back.
  useEffect(() => {
    if (!state.sessionId) return;
    openedRef.current = state.sessionId;
    rememberSession(state.sessionId);
  }, [state.sessionId, rememberSession]);

  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    const named = searchParams.get("session");

    // An address naming a session always wins: it is either a deep link or
    // the row someone just clicked in Earlier runs.
    if (named) {
      if (named === openedRef.current) return;
      openedRef.current = named;
      rememberSession(named);
      void open(named);
      return;
    }

    // Otherwise pick up where they left off, but never over the top of a
    // run in flight or an analysis already on screen.
    if (openedRef.current || isRunning || state.sessionId || !lastSessionKey) return;

    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(lastSessionKey);
    } catch {
      remembered = null;
    }
    if (!remembered) return;

    openedRef.current = remembered;
    void open(remembered);
  }, [searchParams, open, rememberSession, isRunning, state.sessionId, lastSessionKey]);

  /* ── Running ──────────────────────────────────────────────────────── */

  const runAnalysis = useCallback(
    (overrides: Partial<InputBundle> = {}, workflow?: WorkflowSpec) => {
      const next = { ...bundle, ...overrides };
      setBundle(next);
      setSelectedNodeId(null);
      setRerunningId(null);
      searchParams.delete("session");
      setSearchParams(searchParams, { replace: true });
      // The old one is no longer what is on screen; the new id is written
      // below, once the service has created it.
      openedRef.current = null;
      rememberSession(null);
      void start({
        bundle: next,
        mode,
        chosenMethodologyIds: chosenIds,
        workflow: workflow ?? pendingWorkflow ?? undefined,
        customAgents,
      });
      setPendingWorkflow(null);
      // The roster is where a run is watched, so go there when one starts.
      setPanel("agents");
    },
    [
      bundle, mode, chosenIds, pendingWorkflow, customAgents, start,
      searchParams, setSearchParams, rememberSession,
    ],
  );

  /**
   * Arriving from the interview.
   *
   * It lands on the Company tab rather than starting the analysis. The
   * interview is only part of what the agents can read: the pitch deck, the
   * canvas and the financials all sharpen it, and starting the moment the
   * last question is answered would spend several minutes of model time
   * before the user had the chance to attach any of them.
   */
  const arrivedRef = useRef(false);
  useEffect(() => {
    if (arrivedRef.current || searchParams.get("run") !== "1") return;
    if (!seeded) return;

    arrivedRef.current = true;
    setPanel("company");
    searchParams.delete("run");
    setSearchParams(searchParams, { replace: true });
  }, [seeded, searchParams, setSearchParams]);
  const rerunMethodology = useCallback(
    (methodologyId: string) => {
      setRerunningId(methodologyId);
      void start({ bundle, mode: "manual", chosenMethodologyIds: [methodologyId], customAgents });
    },
    [bundle, customAgents, start],
  );

  const submitFollowUp = useCallback(
    (gapAnswers: Record<string, string>) => runAnalysis({ gapAnswers }),
    [runAnalysis],
  );

  /* ── Derived ──────────────────────────────────────────────────────── */

  const graph = useMemo(() => {
    if (state.graph.nodes.length) return state.graph;
    if (state.workflow) return graphFromWorkflow(state.workflow);
    if (pendingWorkflow) return graphFromWorkflow(pendingWorkflow);
    return state.graph;
  }, [state.graph, state.workflow, pendingWorkflow]);

  const selectedNode: GraphNode | null = useMemo(
    () => (selectedNodeId ? graph.nodes.find((node) => node.id === selectedNodeId) ?? null : null),
    [graph, selectedNodeId],
  );

  const selectedResult = useMemo(() => {
    const id = selectedNode ? methodologyIdFromNode(selectedNode.id) : null;
    return id ? state.results[id] ?? null : null;
  }, [selectedNode, state.results]);

  const resultOrder = useMemo(() => {
    const planned = (state.plan?.entries ?? [])
      .filter((entry) => entry.selected)
      .map((entry) => entry.methodologyId);
    const extra = Object.keys(state.results).filter((id) => !planned.includes(id));
    return [...planned, ...extra].filter((id) => state.results[id]);
  }, [state.plan, state.results]);

  // Selecting a node from the graph brings the roster forward.
  const selectFromGraph = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) setPanel("agents");
  }, []);

  useEffect(() => {
    if (state.approval) selectFromGraph(state.approval.nodeId);
  }, [state.approval, selectFromGraph]);

  useEffect(() => {
    if (state.status === "completed" && state.thesis) setPanel("results");
  }, [state.status, state.thesis]);

  const startupName = state.startupName || bundle.startupName;

  /**
   * What the Ask tab may answer from.
   *
   * Rebuilt as the run streams, so a question asked mid-analysis sees the
   * results that exist at that moment rather than waiting for the thesis.
   * The brief is included because asking before any run is a normal case.
   */
  const askContext = useMemo(
    () => ({
      startupName,
      narrative: bundle.narrative,
      profile: state.profile,
      results: state.results,
      reconciled: state.reconciled,
      thesis: state.thesis,
      critique: state.critique,
      disagreements: state.disagreements,
    }),
    [
      startupName, bundle.narrative, state.profile, state.results,
      state.reconciled, state.thesis, state.critique, state.disagreements,
    ],
  );
  const hasOutput = Boolean(state.thesis) || Object.keys(state.results).length > 0;

  /* ── The graph column ─────────────────────────────────────────────── */

  const canvas = graph.nodes.length > 0 ? (
    <AgentGraph
      graph={graph}
      statusMessage={state.statusMessage}
      running={isRunning}
      selectedId={selectedNodeId}
      onSelect={(node) => selectFromGraph(node?.id ?? null)}
    />
  ) : (
    <div className="graph-surface flex h-full items-center justify-center px-8">
      <div className="measure text-center">
        <p className="kicker">No workflow yet</p>
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink-2)]">
          Say what you want done in the panel on the right, or describe the company and run the analysis. The
          orchestrator picks the agents, decides what can run in parallel, and executes the workflow here.
        </p>
        {service.problem ? (
          <span className="mt-6 inline-flex flex-col items-center gap-2 text-[12.5px] leading-relaxed">
            <span className="inline-flex items-start gap-2 text-left text-[var(--caution)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{service.problem}</span>
            </span>
            {service.remedy && (
              <code className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--band)] px-2.5 py-1
                               text-[12px] text-[var(--ink-2)]">
                {service.remedy}
              </code>
            )}
            {service.state === "offline" && (
              <button
                type="button"
                onClick={service.recheck}
                className="text-[12px] text-[var(--accent-ink)] underline underline-offset-4"
              >
                Check again
              </button>
            )}
          </span>
        ) : (
          <span className="mt-6 block text-[11.5px] text-[var(--ink-3)]">
            Connected to {AI_SERVICE_URL}
            {service.health?.mock
              ? " · mock mode, figures are illustrative"
              : service.health?.model
                ? ` · live model: ${service.health.model}`
                : ""}
          </span>
        )}
      </div>
    </div>
  );

  /* ── The panel ────────────────────────────────────────────────────── */

  const rightPanel = (
    <Tabs value={panel} onValueChange={setPanel} className="flex h-full min-h-0 flex-col">
      <TabsList className="flex h-auto w-full shrink-0 justify-start gap-5 rounded-none border-b
                           border-[var(--rule)] bg-[var(--surface)] px-5 py-0">
        {PANELS.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3.5 text-[13px]
                       text-[var(--ink-3)] shadow-none data-[state=active]:border-[var(--accent-ink)]
                       data-[state=active]:bg-transparent data-[state=active]:text-[var(--ink-1)]
                       data-[state=active]:shadow-none"
          >
            {item.label}
            {item.value === "results" && hasOutput && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-ink)]" aria-hidden="true" />
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Ask - a conversation about the company. */}
      <TabsContent value="ask" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <AskChat
          context={askContext}
          startupName={startupName}
          hasAnalysis={Object.keys(state.results).length > 0}
        />
      </TabsContent>

      <TabsContent value="company" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 py-6">
          <IntakePanel
            bundle={bundle}
            onBundleChange={(patch) => setBundle((prev) => ({ ...prev, ...patch }))}
            mode={mode}
            onModeChange={setMode}
            chosenIds={chosenIds}
            onChosenIdsChange={setChosenIds}
            customAgents={customAgents}
            onStart={() => runAnalysis()}
            onCancel={cancel}
            isRunning={isRunning}
          />
        </div>

        <Block
          title="Financial management"
          action={
            <span className="text-[12px] text-[var(--ink-3)]">
              {snapshots.length ? `${snapshots.length} on file` : "None yet"}
            </span>
          }
        >
          <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
            Revenue, burn and runway have their own section. The Financial agent reads the latest snapshot from there.
          </p>
          <Link
            to="/financials"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-[var(--accent-ink)]
                       underline-offset-4 transition-colors hover:underline"
          >
            Open financial management
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Block>

        <Block title="Overall summary">
          <StartupSummaryPanel />
        </Block>
      </TabsContent>

      {/* Agents: the live roster once there is a run, your own agents before. */}
      {/* Agents. Also holds the run controls that used to sit under Ask,
          now that Ask is a conversation rather than a launcher. */}
      <TabsContent value="agents" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <Block title="Tell it what to do">
          <CommandBar
            startupName={startupName}
            startupContext={state.profile ?? { name: startupName, narrative: bundle.narrative }}
            customAgents={customAgents}
            disabled={isRunning}
            onNeedStartup={() => setPanel("company")}
            onRun={(workflow) => {
              setChosenIds([]);
              runAnalysis({}, workflow);
            }}
          />
          <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
            Or press Run above and the orchestrator selects the standard agents for this company itself.
          </p>
        </Block>

        {templates.length > 0 && (
          <Block title="Saved workflows">
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setPendingWorkflow(template.workflow)}
                  title={template.description}
                  className={`rounded-[var(--radius)] border px-3 py-1.5 text-[12.5px] transition-colors ${
                    pendingWorkflow?.id === template.id
                      ? "border-[var(--accent-ink)] text-[var(--ink-1)]"
                      : "border-[var(--rule-strong)] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
            {pendingWorkflow && (
              <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                {pendingWorkflow.name} is loaded. It runs when you press Run.
              </p>
            )}
          </Block>
        )}

        {history.length > 0 && (
          <Block title="Earlier runs">
            <ul>
              {history.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ session: session.id })}
                    className="flex w-full items-center gap-3 border-b border-[var(--rule)] py-2.5 text-left
                               transition-colors last:border-b-0 hover:bg-[var(--band)]"
                  >
                    <History className="h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink-1)]">
                      {session.startupName}
                    </span>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-[var(--ink-3)]">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {graph.nodes.length > 0 || state.log.length > 0 ? (
          <AgentRail
            graph={graph}
            selectedNode={selectedNode}
            selectedResult={selectedResult}
            log={state.log}
            running={isRunning}
            onSelect={setSelectedNodeId}
            onRerun={isRunning ? undefined : rerunMethodology}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <Block
              title="Your agents"
              action={
                <span className="text-[12px] text-[var(--ink-3)]">
                  {customAgents.length ? `${customAgents.length} added` : "12 built in"}
                </span>
              }
            >
              <CustomAgentPanel agents={customAgents} onChange={setCustomAgents} disabled={isRunning} />
            </Block>
          </div>
        )}
      </TabsContent>

      {/* Results */}
      <TabsContent value="results" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 py-6">
          {state.error && (
            <p className="mb-5 text-[13px] leading-relaxed text-[var(--negative)]">{state.error}</p>
          )}

          {state.degradations.length > 0 && (
            <div className="mb-6">
              <p className="kicker">Reduced coverage</p>
              <ul className="mt-2 space-y-1.5">
                {state.degradations.map((item, index) => (
                  <li key={index} className="text-[12.5px] leading-relaxed text-[var(--ink-2)]">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {hasOutput ? (
            <Tabs defaultValue="report">
              {/* This panel is 470px wide, which is enough to read a memo in
                  and not enough to see one. The full report gets a page. */}
              {state.thesis && (
                <Link
                  to={state.sessionId ? `/report/${state.sessionId}` : "/report"}
                  className="mb-6 flex items-center justify-between gap-3 border border-[var(--rule)]
                             bg-[var(--band)] px-4 py-3 transition-colors hover:border-[var(--rule-strong)]"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] text-[var(--ink-1)]">Open the full report</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[var(--ink-3)]">
                      Valuation bridge, dimension charts and the risk matrix, at full width
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--accent-ink)]" aria-hidden />
                </Link>
              )}

              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-5 rounded-none border-b
                                   border-[var(--rule)] bg-transparent p-0">
                {["report", "valuation", "methods", "critique"].map((value) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-0
                               text-[12.5px] capitalize text-[var(--ink-3)] shadow-none
                               data-[state=active]:border-[var(--accent-ink)] data-[state=active]:bg-transparent
                               data-[state=active]:text-[var(--ink-1)] data-[state=active]:shadow-none"
                  >
                    {value}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="report" className="mt-6">
                <InvestmentReport
                  thesis={state.thesis}
                  profile={state.profile}
                  results={state.results}
                  critique={state.critique}
                  disagreements={state.disagreements}
                  startupName={startupName}
                />
                {state.thesis && (
                  <FollowUpPanel
                    gaps={state.thesis.missingInformation}
                    existingAnswers={bundle.gapAnswers}
                    onSubmit={submitFollowUp}
                    disabled={isRunning}
                  />
                )}
              </TabsContent>

              <TabsContent value="valuation" className="mt-6">
                <ValuationPanel
                  results={state.results}
                  reconciled={state.reconciled}
                  disagreements={state.disagreements}
                />
              </TabsContent>

              <TabsContent value="methods" className="mt-6">
                <MethodologyResults
                  results={state.results}
                  order={resultOrder}
                  onRerun={isRunning ? undefined : rerunMethodology}
                  rerunning={isRunning ? rerunningId : null}
                />
              </TabsContent>

              <TabsContent value="critique" className="mt-6">
                <CriticPanel
                  critique={state.critique}
                  disagreements={state.disagreements}
                  iterations={state.iterations}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <Empty>
              Results land here as each agent finishes. The memo is written last, from the evidence the verification
              agent accepted.
            </Empty>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--page)]">
      <SiteHeader />

      {/* Run bar: the company, what is happening, and the one control. */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[var(--rule)] px-5 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-[var(--ink-1)]">
            {startupName || "New evaluation"}
          </p>
          <p className="truncate text-[12px] text-[var(--ink-3)]" role="status" aria-live="polite">
            {state.statusMessage
              || state.workflow?.name
              || pendingWorkflow?.name
              || "Describe the company, then say what you want done"}
          </p>
        </div>

        {state.thesis && <RecommendationBadge value={state.thesis.recommendation} size="sm" />}

        {isRunning ? (
          <button
            type="button"
            onClick={cancel}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border
                       border-[var(--rule-strong)] px-3.5 py-1.5 text-[13px] text-[var(--ink-2)]
                       transition-colors hover:border-[var(--negative)] hover:text-[var(--negative)]"
          >
            <Square className="h-3 w-3" aria-hidden="true" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => runAnalysis()}
            disabled={!configured}
            title={service.problem ?? undefined}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] bg-[var(--accent-ink)]
                       px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity
                       hover:opacity-90 disabled:opacity-50"
          >
            <Play className="h-3 w-3" aria-hidden="true" />
            Run
          </button>
        )}

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Show the panel" : "Give the graph the whole window"}
          aria-pressed={expanded}
          className="hidden shrink-0 rounded-[var(--radius)] p-1.5 text-[var(--ink-3)]
                     transition-colors hover:text-[var(--ink-1)] lg:block"
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Workspace: workflow in the middle, everything else on the right. */}
      <div className="flex min-h-0 flex-1">
        {/* Below a laptop the graph needs more width than a phone has, so the
            panel takes the screen and the canvas waits for a bigger one. */}
        <div className="hidden min-w-0 flex-1 lg:block">{canvas}</div>

        {!expanded && (
          <aside
            className="flex min-h-0 w-full shrink-0 flex-col border-[var(--rule)] bg-[var(--surface)]
                       lg:w-[440px] lg:border-l xl:w-[480px]"
            aria-label="Workflow panel"
          >
            {/* A blocked run is the one thing that must interrupt, so it sits
                above the tabs rather than inside one of them. */}
            {state.approval && (
              <div className="shrink-0 border-b border-[var(--rule)] bg-[var(--band)] p-4">
                <ApprovalGate
                  approval={state.approval}
                  busy={state.resolvingApproval}
                  onRespond={(approved, note) => void respondToApproval(approved, note)}
                />
              </div>
            )}
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
};

export default Workflow;

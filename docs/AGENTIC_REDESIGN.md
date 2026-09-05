# InvestVCS → AI-native investment intelligence OS

Working document for the agentic transformation. Phase 1 (audit) and Phase 2
(architecture) are recorded here; later phases reference it.

---

## Phase 1 — Audit of the existing product

### 1.1 Stack

| Layer | Reality |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite, react-router v6, TanStack Query, Tailwind + shadcn/ui |
| Data | Supabase (Postgres + RLS + auth + storage), 20 tables, 20 migrations |
| Serverless | 4 Supabase edge functions (Deno) |
| AI service | `ai/` — FastAPI orchestrator, 12 methodology agents, SSE streaming |
| Hosting | Railway (`railway.json`, `nixpacks.toml`), separate nixpacks for `ai/` |

### 1.2 Routes and what each one actually is

| Route | Page | Capability held | Fate |
| --- | --- | --- | --- |
| `/` | `Index` | Marketing landing | Reposition: infrastructure narrative |
| `/analyst` | `InvestmentAnalyst` | Live agent run: intake, graph, report | **Becomes the product.** Split into workspace |
| `/evaluation` | `StartupEvaluation` | Berkus, Scorecard, Risk Factor, VC, First Chicago forms | Forms become **intake tools** for the Valuation agents |
| `/readiness` | `ReadinessLevel` | TRL / CRL / FRL questionnaires | Intake tool for the Readiness agent |
| `/preparation` | `PreparationPhase` | Financial snapshot entry, calculator | Intake tool for the Financial agent |
| `/summary` | `OverallSummary` | Aggregated scores across the above | Superseded by the investment report; kept as a startup-record tab |
| `/venture-analysis` | `VentureAnalysis` | `analyze-venture` edge fn, deck analysis | Folded into the Research/Understand agent |
| `/investor` | `InvestorDashboard` | Investor deal view | Becomes **Portfolio** |
| `/funding-view` | `FundingViewPage` | Funding rounds and interests | Startup-record tab |
| `/investors` | `Investors` | Approved investor directory | Keep, secondary |
| `/community`, `/growth-hub` | Community, GrowthHub | Social feed, trends | Keep, secondary. Not agentic |
| `/vacancies`, `/job-match` | Vacancies, JobMatch | Jobs and CV matching (`match-jobs`) | Separate audience. Keep, isolate |
| `/admin` | `AdminPanel` | Moderation, approvals, vouchers | Keep |
| `/profile`, `/u/:id` | Profile pages | Identity | Keep |
| `/pricing` `/success` `/cancel` `/privacy` `/terms` `/contact` | Static and billing | — | Keep |

### 1.3 Audiences

Four roles coexist (`useUserRole`): **founder**, **investor**, **job seeker**,
**admin**. The agentic transformation targets the founder and investor
surfaces. The job-seeker surface stays a conventional app; forcing it through
an orchestrator would be theatre.

### 1.4 What already exists on the agent side (important)

The backend is **not** a stub. `ai/app/` already implements:

- `registry.py` — 12 methodologies with schemas, applicability gates, priorities
- `workflow.py` — `Workflow` / `WorkflowNode` / `WorkflowEdge` as first-class
  objects, layered for parallelism, per-node `tools`, `requires_approval`,
  `rationale`; plus 4 saved templates
- `orchestrator.py` (939 lines) — executes a workflow, emits SSE events, runs
  the critic and revise loop, handles approvals and degradations
- `commands.py` — natural language into an executable workflow, with a
  deterministic keyword fallback
- `selection.py` — planner deciding which methodologies this company supports
- `reconcile.py` — weighted, outlier-aware valuation reconciliation
- `confidence.py`, `normalise.py`, `schemas.py`, `mock.py`, `runs.py`

HTTP surface: `GET /health` `/registry` `/graph` `/workflows` `/runs`,
`POST /command` `/analyze` (SSE) `/runs/{id}/approve` `/compare`.

Frontend already has `src/lib/analyst/*` (typed event contract, SSE parser,
persistence to `investment_analysis_sessions`) and `src/components/analyst/*`
(10 panels including an `AgentGraph`).

**Conclusion: the agent layer is real and does not need inventing. The gap is
product surface.**

### 1.5 Gaps

1. `service.ts` does not expose `/command`, `/workflows`, `/runs`, or
   `/runs/{id}/approve`. The command bar and human-in-the-loop have backends
   with no client.
2. `/analyst` is one long scrolling page inside the generic `DashboardLayout`.
   The graph is a section, not the primary object.
3. No workspace shell, no persistent command bar, no agent inspector, no
   execution timeline, no workflow builder.
4. No `Startup` entity. Data hangs off `user_id`, so one account is one
   startup. An investor cannot hold a portfolio of startup records.
5. Navigation is feature-shaped (11 links across two components), not
   intent-shaped.

### 1.6 Design findings (against `taste/design-taste.md`)

| # | Finding | Severity |
| --- | --- | --- |
| 1 | Dark canvas default (`216 12% 6%`) with violet and cyan glow. Brief calls for white enterprise | High |
| 2 | Glassmorphism utilities (`origin-glass`, `backdrop-filter: blur(16px)`) | High |
| 3 | Animated gradient text (`text-origin-gradient`, `origin-pan` keyframes) | High |
| 4 | Six vivid gradient card classes plus six tinted glass classes | High |
| 5 | Colored left-border accent strips on alerts. Explicitly banned | Medium |
| 6 | Em-dashes throughout UI copy. Named AI tell | Medium |
| 7 | Two token systems: global `--background` and a scoped `.analyst` set. Single-theme consistency violated | High |
| 8 | Playfair Display for headings across a data product | Medium |
| 9 | Emoji in nav labels, stripped at runtime with `.replace("📊 ", "")` | Medium |

---

## Phase 2 — Target architecture

### 2.1 Layering

```
  Surface      AI Workspace shell, command bar, graph canvas, inspector, timeline
     |
  Workflow     WorkflowSpec + runtime AgentGraphData + ExecutionLog + Approvals
     |
  Agent        understand / select / 12 methodologies / critic / reconcile / synthesis
     |
  Tool         deck_extract, financial_snapshot, deterministic_compute, ...
     |
  Data         Supabase tables, founder-entered forms, deck text
```

The frontend consumes workflow state and renders it. It never simulates it.
Where the service is unreachable the UI says so rather than animating.

### 2.2 Capability mapping: existing feature into agentic role

| Existing | Becomes |
| --- | --- |
| Berkus / Scorecard / Risk Factor / VC / First Chicago forms | Valuation agents; forms demoted to tool inputs |
| TRL / CRL / FRL questionnaire | Readiness agent |
| Financial calculator and snapshots | Financial agent plus `financial_snapshot` tool |
| Business Model Canvas | Business Model agent plus `business_model_canvas` tool |
| `analyze-venture` deck analysis | Understand agent plus `deck_extract` tool |
| `orchestrate-analysis` edge function | Superseded by the `ai/` orchestrator |
| Overall Summary aggregation | Reconcile and Synthesis agents |
| Investor dashboard | Portfolio over the Startup entity |
| Admin approvals | Human-in-the-loop checkpoints |

### 2.3 Startup as the central entity

```
Startup
├── documents        (deck text, files)
├── intake           (bmc, financial snapshots, questionnaire answers)
├── runs             (workflow executions)
│   ├── graph        (nodes + edges + status)
│   ├── logs         (execution timeline)
│   ├── approvals    (human checkpoints)
│   └── outputs      (profile, plan, results, reconciled, critique, thesis)
├── evidence         (claim to source ledger)
└── reports
```

Migration path: `investment_analysis_sessions` already stores a run. Add a
`startups` table and a nullable `startup_id` on it, backfilling one startup
per existing user so nothing breaks.

### 2.4 Navigation, intent-shaped

`Home · Startups · Workflows · Agents · Research · Portfolio · Reports`,
with the command bar persistent at the bottom of the workspace. Community,
Growth Hub, jobs and admin move to a secondary menu.

### 2.5 Visual direction

Archetype: **High-End Agency** crossed with **Industrial Brutalism** for the
data surfaces. Bloomberg discipline, Linear restraint.

- Warm white page, off-black ink, hairline rules
- One accent, low chroma, used for running state and links only
- Status carries an icon plus text, never colour alone
- Inter for UI, tabular figures everywhere numbers appear
- No glass, no gradient text, no gradient cards, no coloured border strips
- Motion: transform and opacity only, `ease-out`, one signature motion per
  view (the edge particle), full `prefers-reduced-motion` fallback

Single token source in `src/index.css`; the `.analyst` scope is dissolved into
it so every page reads from one theme.

### 2.6 Phase state

| Phase | Deliverable | State |
| --- | --- | --- |
| 1 | Audit | done, sections 1.1 to 1.6 |
| 2 | Design system | done. Single token source in `src/index.css`, light enterprise palette, all AA or better |
| 3 | AI workspace shell and command bar | done. `WorkspaceShell`, `CommandBar`, `/workspace` |
| 4 | Workflow graph canvas | done. `AgentGraph` rebuilt: shape-plus-colour status, edge particles, approval state |
| 5 | Methodologies as agents and tools | done. Backend already had it; `/agents` now exposes the roster and its limits |
| 6 | Workflow state and execution visualisation | done. `run` and `log` events wired through `service.ts` and the hook |
| 7 | Agent inspector and execution timeline | done. `AgentInspector`, `ExecutionTimeline` |
| 8 | Natural language into a workflow | done. `POST /command` wired; the plan is shown before it runs |
| 9 | Human in the loop | done. `ApprovalGate` plus `POST /runs/{id}/approve` |
| 10 | Polish, responsiveness, a11y | done for the workspace surface; legacy pages carry over the theme but keep their own layouts |
| 14 | Workflow builder | done. `/workflows` edits the executable spec with a live preview |

### 2.7 Verification

- 73 frontend tests, 137 Python tests, clean typecheck, clean production build.
- Verified live against the service in mock mode: a command compiled to a
  19-node workflow, ran 19 of 19 stages, and produced a reconciled valuation
  and a recommendation. Node inspector, execution timeline and the workflow
  builder preview were all exercised in the browser.

### 2.8 Not done

- **Startup entity (section 2.3).** Data still hangs off `user_id`, so one
  account is one startup. `Portfolio`, `Research` and `Reports` in the rail
  currently point at the existing pages that hold those capabilities
  (`InvestorDashboard`, `VentureAnalysis`, `OverallSummary`) rather than at
  views over a Startup record. `Startups` is deliberately absent from the rail
  until the `startups` table and the `startup_id` backfill described above
  exist.
- **Landing page repositioning.** `Index.tsx` now reads from the new tokens and
  is legible, but its copy and section rhythm are still the old marketing
  narrative rather than the infrastructure positioning in section 2.5.
- **Legacy evaluation pages.** `/evaluation`, `/readiness`, `/preparation` and
  `/summary` work and are on the new theme, but they are still forms rather
  than framed as intake for the agents that consume them.

---

## Revision 2 — backend fix and the "Signal" redesign

### Backend

The deployed service failed every model call: it spoke Azure OpenAI
chat-completions to an Azure AI Foundry **agent Responses** endpoint. Five
defects, each confirmed against the live endpoint:

| # | Defect | Result |
| --- | --- | --- |
| 1 | `chat_url` appended `/openai/deployments/{model}/chat/completions` to an endpoint already ending in `/responses` | 404 |
| 2 | `auth_headers` sent `Authorization: Bearer`; Foundry requires `api-key` | 403 |
| 3 | `AZURE_AI_MODEL` did not match the agent's pinned model | 400 |
| 4 | Request used `messages` / `max_tokens` / `response_format` / a `system` role, all rejected when an agent is specified | 400 |
| 5 | Reply parsed as `choices[0].message.content`; Responses returns `output[] -> message -> output_text` | empty |

`config.py` now detects the protocol from the endpoint (`AI_PROTOCOL`
overrides) and `llm.py` speaks either surface. Two further fixes: reasoning
tokens share the output budget on this API, so `LLM_MAX_OUTPUT_TOKENS` rose to
16384 and truncation is now reported as such rather than as a JSON parse
failure. 16 regression tests pin the URL, auth, payload and reply shapes.

Also found: `VITE_AI_SERVICE_URL` was absent, so every frontend build shipped
with no service URL regardless of backend health.

### Design system

Palette replaced after looking at how agent and workflow products present
themselves (LangGraph, Inngest, n8n, Temporal, Braintrust). The common pattern
is a near-neutral ground, one saturated signal colour, monospace labels and
type contrast instead of decoration. Applied on a light ground.

Verified against the page ground `#FBFBF9`: ink 17.79:1, ink-2 6.49:1,
ink-3 4.74:1, accent 6.77:1, positive 6.42:1, caution 5.72:1, negative 6.72:1,
white on accent 7.01:1.

### Structure

- `components/layout/` — `PageShell`, `SiteHeader`, `SiteFooter`. `Layout` and
  `DashboardLayout` are now thin adapters over these, so all 20+ pages that
  import them inherit the chrome.
- `pages/Workflow.tsx` — the core flow on one page. `Workspace`, `Workflows`,
  `Agents` and `InvestmentAnalyst` are gone; their routes redirect to
  `/workflow`.
- Deleted: `components/landing/` (7 files), `Navbar`, `AppSidebar`,
  `OriginBackground`, `WorkspaceShell`.

### Known, not fixed

- ~105 em-dashes remain in component UI copy. Mechanically rewriting them
  risks mangling grammar across 20 files for a stylistic rule; left for a
  deliberate copy pass.
- The `analysis_sessions` Supabase migration is not applied to the deployed
  project, so run history is empty. Persistence failures are caught and do not
  block a run.

---

## Revision 3 — bigger canvas, custom agents, financials, summary

### Graph

The single-page layout had shrunk the graph to the width of the text column.
It now bleeds to the full viewport (`clamp(420px, 62vh, 760px)` tall) with a
full-screen mode that carries the inspector alongside it. The bleed overshoots
the client width by the scrollbar, so the page wrapper uses `overflow-x: clip`
rather than `hidden`, which would create a scroll container and break the
sticky header. Verified: no horizontal overflow, graph 1396px against a 1120px
column.

### Custom agents

A user-defined agent is a real methodology, not a node on a picture.
`ai/app/custom.py` builds a `MethodologySpec` from a definition sent with the
run, and `registry.active()` merges a per-run overlay over the built-ins, so
the gate, the planner, the executor, the critic and the reconciler all see it
through the paths they already use. Every `registry.REGISTRY` iteration that
enumerates candidates became `registry.active()`.

Two honesty constraints are built in: a custom agent has no deterministic
compute to cross-check the model, so its base confidence is capped at 0.55 and
that limitation is stated on every result it produces.

A bug found while verifying over HTTP: the overlay was set around the
streaming response, but the run executes in a task the HTTP layer does not
own, so the agent was silently dropped. Custom specs are now carried on the
`Orchestrator` itself. `test_the_orchestrator_does_not_depend_on_the_caller_context`
pins it.

### Financial management and summary

Sections 06 and 07 of the Workflow page. The summary reads
`src/lib/startupScores.ts`, extracted so the Workflow page and the Overall
Summary page cannot drift apart; the readiness levels and financial health
score come from the same methodology modules the agents use. Financial
management embeds the existing calculator and dashboard, writing to the same
snapshots the Financial agent reads.

Page order: 01 ask · 02 company · 03 your agents · 04 the run · 05 conclusions
· 06 overall summary · 07 financial management · 08 earlier runs.

162 Python tests, 73 frontend tests, clean typecheck and build.

---

## Revision 4 — workspace layout, financials split out

The run section is now a workspace rather than a stack: the workflow graph
holds the middle at full-bleed width, and `AgentRail` runs down the right with
the live roster, the timeline, and the inspector. Selecting an agent in the
rail and selecting a node in the graph are one action, so the two never drift.
Below `lg` the rail moves under the canvas so the graph keeps a usable width.

Financial management left the workflow page for `/financials`, with a pointer
in section 07. Entering a month of figures is deliberate work and does not
belong beside a running pipeline. `/preparation` redirects there and
`PreparationPhase` is gone; the `FinancialSnapshot` type it exported moved to
`src/lib/financialTypes.ts`, because a shared type should not depend on a page
existing.

Page order: 01 ask · 02 company · 03 your agents · 04 the run · 05 conclusions
· 06 overall summary · 07 financials (link) · 08 earlier runs.

---

## Revision 5 — one screen: workflow centre, everything else right

The Workflow page is no longer a scrolling document. It is a fixed-height
workspace (`h-dvh`, no page scroll):

```
  SiteHeader
  Run bar        company · status · Run/Stop · full-screen
  ┌──────────────────────────────┬──────────────────────┐
  │                              │ Ask Company Agents   │
  │      WORKFLOW GRAPH          │ Results              │
  │      (fills the middle)      │                      │
  │                              │ panel scrolls here   │
  └──────────────────────────────┴──────────────────────┘
```

Everything that used to be a page section is now a tab in the 440–480px right
panel:

| Tab | Holds |
| --- | --- |
| Ask | Command bar, saved workflows, earlier runs |
| Company | Intake brief, financials link, overall summary |
| Agents | Live roster and timeline once a run exists; your custom agents before |
| Results | Report, valuation, methodologies, critique |

The panel follows the run rather than making the user chase it: starting a run
opens Agents, finishing one opens Results, and selecting a node in the graph
opens Agents with that agent's detail. Selection is shared, so graph and roster
never disagree.

An approval sits above the tabs, not inside one, because a blocked run must
interrupt whatever the user is looking at. The full-screen control hides the
panel and gives the graph the window.

Below `lg` the panel takes the screen and the canvas waits for a wider one; a
19-node graph is not readable on a phone and pretending otherwise helps nobody.

Verified live: 19 of 19 nodes, panel auto-switched to Results with a
recommendation and a reconciled range, roster listing every agent with its
score. 162 Python tests, 73 frontend tests, clean typecheck and build.

---

## Revision 6 — Ask tab fixed, autonomous run fixed

### Why Ask did not work

Three faults, found by driving it rather than reading it.

1. **No way in.** Moving the brief into the Company tab left Ask unable to
   satisfy its own precondition: the keyword fallback returns
   `needsStartup: true`, so the compiled plan was blocked behind "This needs a
   startup loaded first" with no control to act on it. The Ask tab now carries
   the company name and description itself, writing to the same bundle the
   Company tab edits, and the blocked message carries a button that opens the
   Company tab.
2. **The fields vanished mid-typing.** The company block was rendered only
   while `startupName` was empty, so typing a name removed the block and the
   description field with it. It is always shown now.
3. **Broken sentence.** The em-dash removal in revision 2 left
   "…was unavailable. review the workflow below", lowercase after a full stop.

### Why "run autonomous" did not run the standard agents

`rerunMethodology` set `mode = "manual"` and `chosenIds = [id]` on the page and
never reset them. Re-running a single agent once left the Run button quietly
running that one agent for the rest of the session. The re-run now passes its
mode and id straight to `start()` and tracks the agent in its own
`rerunningId` state, so nothing a re-run does can change what Run means.

### QA, in the browser

| Check | Result |
| --- | --- |
| Ask: company + instruction, compile | Proposed workflow, not blocked |
| Ask: Run it on a scoped command | 10 nodes, 3 methodologies (correct scope) |
| Run after a scoped command | 19 nodes, 12 methodologies (standard set) |
| Re-run one agent, then Run | 8 nodes, then 19 (bug fixed) |
| 9 routes swept | No horizontal overflow anywhere |
| Console | Only the known `analysis_sessions` failures |

162 Python tests, 73 frontend tests, clean typecheck and build.

### Still needs you

`supabase/migrations/20260901120000_investment_analysis_sessions.sql` is not
applied to the deployed project. The table names in the migration and in
`persistence.ts` match, so this is deployment, not code: run history and
session persistence fail silently until it is pushed. Runs themselves work.

---

## Revision 7 — the service connection

### What was wrong

`VITE_AI_SERVICE_URL` was empty, so `isServiceConfigured()` was false and the
UI disabled itself: the Run button was un-pressable and the command bar was
read-only. Typing a company did nothing visible because there was nothing the
page would let you do with it. Correct behaviour for a production build with no
address; wrong behaviour for someone running the app on their own machine.

The message was also unhelpful. It said "set VITE_AI_SERVICE_URL and rebuild"
whether the address was missing or the service simply was not running, which
are different problems with different fixes.

### What changed

1. **A development default.** With no variable set, `AI_SERVICE_URL` falls back
   to `http://127.0.0.1:8123` in dev builds. Production builds still require an
   explicit address, because there is no sensible guess.
2. **Configured and reachable are now separate.** `useServiceHealth` polls
   `/health` and reports `unconfigured`, `offline` or `online`, each with the
   sentence describing it and the command that fixes it.
3. **The page recovers on its own.** While offline it re-checks every five
   seconds, so starting the service makes the app reconnect without a reload.
4. **One command to run everything.** `npm run dev:all` starts the Python
   service and Vite together and stops both on Ctrl-C; `npm run ai` starts the
   service alone; `npm run ai:install` installs its dependencies. No new
   packages: `scripts/dev.mjs` and `scripts/ai.mjs` use `node:child_process`.
5. **Mock by default.** Both scripts default to `AI_MOCK=1`, so the pipeline
   runs end to end before any model credentials exist, and the UI says
   "mock mode, figures are illustrative" rather than presenting canned numbers
   as analysis.
6. `SETUP.md` documents it, and `.env` now carries the local address.

### A bug found while testing the fix

The offline retry was a `setTimeout` rescheduled from state. A failed re-check
sets `"offline"` over `"offline"`, React bails out of the render, the effect
never re-runs, and exactly one retry ever happened. Verified by watching the
page fail to recover, then fixed with an interval and verified again.

### QA, in the browser

| Check | Result |
| --- | --- |
| `npm run dev:all` | Both processes up, health 200 |
| Service running | "Connected to … · mock mode", Run enabled |
| Service stopped | "not answering at …", `npm run ai`, Check again, Run still pressable |
| Service restarted, no reload | Reconnected within 8s |
| Full run after reconnect | 19 nodes, all settled, panel moved to Results |

162 Python tests, 73 frontend tests, clean typecheck and build.

---

## Revision 8 — running on the real model

### Why it was stuck on canned output

Two independent reasons, both mine:

1. **The service never read `.env`.** `config.py` used `os.getenv` only, and
   nothing loaded the file the frontend already used, so however it was
   started the service had no Azure credentials.
2. **The dev scripts forced `AI_MOCK=1`.** Sensible when there were no working
   credentials; wrong once there were.

### What changed

* `config.py` now reads `.env` from the repo root and from `ai/`, without
  overriding real environment variables, so a deployment is never overridden by
  a stray file. Hand-rolled rather than adding python-dotenv for twenty lines.
* `AI_MOCK` became three-state: `1` forces canned output, `0` forces the real
  model, and **unset means real when an endpoint is configured, canned when it
  is not**. The scripts no longer force anything.
* The workflow page now says which it is: "live model: gpt-5-mini" or
  "mock mode, figures are illustrative".

### A real failure found by running it

The first full real run failed one agent on an Azure **429**: four agents
re-running in parallel exceeded the deployment quota, and the client retried
after 1.2s and 2.4s, spending quota that was already gone.

Fixed by honouring the server's own instruction: `Retry-After` (and the
`x-ratelimit-reset-*` headers) is read off the 429 and waited out, with a
longer default backoff for rate limits than for network faults, capped at 60s.
Concurrency went back to 3, because the deployment's rate limit rather than the
orchestrator is what caps throughput here.

### Verified against the live model

| | First run | After the fix |
| --- | --- | --- |
| Rate limits | 3 | **0** |
| Failed agents | 1 (Team & Traction) | **0** |
| Degradations | 1 | **0** |
| Wall clock | 384s | 382s |

The second run: understanding 36s, planner chose **5 of 12** methodologies on
its own, Market 3.6/10, Competitive 2.4/10, Business Model 4.0/10, Financial
3.0/10, Risk 0.7/10, critic returned "insufficient data", reconciliation
declined to produce a valuation, thesis **"pass"**. A genuinely critical read
of a thin narrative, which is what the canned output could never show.

165 Python tests (3 new for rate limits), 73 frontend tests.

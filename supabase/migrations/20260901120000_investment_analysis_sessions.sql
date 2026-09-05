-- Autonomous investment-analysis sessions.
--
-- One row per analysis run, plus a traceable record of every agent execution
-- and every evidence-backed claim. Users see only their own sessions.

create table if not exists public.analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  startup_name text not null default 'Untitled startup',
  mode text not null default 'autonomous'
    check (mode in ('autonomous', 'guided', 'manual')),
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'running', 'waiting_for_input', 'completed', 'failed')),

  -- Normalised inputs the agents read from.
  input_bundle jsonb not null default '{}'::jsonb,

  -- Stage outputs. Each is null until its stage completes.
  startup_profile jsonb,
  analysis_plan jsonb,
  methodology_results jsonb not null default '{}'::jsonb,
  disagreements jsonb not null default '[]'::jsonb,
  reconciled_valuation jsonb,
  critique jsonb,
  final_thesis jsonb,

  iteration integer not null default 0,
  degradations jsonb not null default '[]'::jsonb,
  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.analysis_sessions enable row level security;

drop policy if exists "Users read their own analysis sessions" on public.analysis_sessions;
create policy "Users read their own analysis sessions"
  on public.analysis_sessions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create their own analysis sessions" on public.analysis_sessions;
create policy "Users create their own analysis sessions"
  on public.analysis_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own analysis sessions" on public.analysis_sessions;
create policy "Users update their own analysis sessions"
  on public.analysis_sessions for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users delete their own analysis sessions" on public.analysis_sessions;
create policy "Users delete their own analysis sessions"
  on public.analysis_sessions for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists analysis_sessions_user_created_idx
  on public.analysis_sessions (user_id, created_at desc);


-- Per-agent execution trace: what ran, when, with what input, what it
-- produced, its confidence and any error.
create table if not exists public.analysis_agent_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  agent text not null,
  methodology_id text,
  label text not null default '',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'skipped')),
  iteration integer not null default 0,

  input jsonb,
  output jsonb,
  confidence numeric,
  error text,

  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now()
);

alter table public.analysis_agent_runs enable row level security;

drop policy if exists "Users read their own agent runs" on public.analysis_agent_runs;
create policy "Users read their own agent runs"
  on public.analysis_agent_runs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create their own agent runs" on public.analysis_agent_runs;
create policy "Users create their own agent runs"
  on public.analysis_agent_runs for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own agent runs" on public.analysis_agent_runs;
create policy "Users update their own agent runs"
  on public.analysis_agent_runs for update
  to authenticated
  using (auth.uid() = user_id);

create index if not exists analysis_agent_runs_session_idx
  on public.analysis_agent_runs (session_id, created_at);


-- Evidence ledger: every material claim, its supporting evidence, where that
-- came from and how much it is trusted. Separate from the agent output so a
-- claim can be queried across sessions.
create table if not exists public.analysis_evidence (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  claim text not null,
  evidence text not null default '',
  source text not null default 'unspecified',
  source_type text not null default 'inferred'
    check (source_type in ('provided', 'derived', 'inferred', 'absent')),
  confidence numeric not null default 0.5,
  methodology text not null default '',
  reasoning text not null default '',

  created_at timestamptz not null default now()
);

alter table public.analysis_evidence enable row level security;

drop policy if exists "Users read their own analysis evidence" on public.analysis_evidence;
create policy "Users read their own analysis evidence"
  on public.analysis_evidence for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create their own analysis evidence" on public.analysis_evidence;
create policy "Users create their own analysis evidence"
  on public.analysis_evidence for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their own analysis evidence" on public.analysis_evidence;
create policy "Users delete their own analysis evidence"
  on public.analysis_evidence for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists analysis_evidence_session_idx
  on public.analysis_evidence (session_id);
create index if not exists analysis_evidence_methodology_idx
  on public.analysis_evidence (user_id, methodology);


-- Keep updated_at honest without relying on the client.
create or replace function public.touch_analysis_session()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists analysis_sessions_touch on public.analysis_sessions;
create trigger analysis_sessions_touch
  before update on public.analysis_sessions
  for each row execute function public.touch_analysis_session();

-- The founder interview, kept where the rest of the account is.
--
-- Thirty-seven questions, their resolutions and the history behind them lived
-- in localStorage alone. That is one browser: clearing site data, a second
-- machine or a private window all presented a founder who had answered
-- nothing, while the analysis that had already read those answers went on
-- quoting them. The interview is account data and belongs in the account.
--
-- One row per user. The interview is a single evolving document rather than a
-- log, and a founder answers about one company at a time, so the primary key
-- is the user and a re-take replaces what was there.

create table if not exists public.assessment_interviews (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- The client's session id, kept so a row can be matched to a browser that
  -- still holds the same session and to spot a stale overwrite.
  session_id text not null,
  startup_name text not null default '',

  -- Answers keyed by question id, and the founder's resolutions of the
  -- contradictions the engine raised. Shape is the client's; the database
  -- stores it rather than interpreting it.
  answers jsonb not null default '{}'::jsonb,
  resolutions jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,

  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assessment_interviews enable row level security;

drop policy if exists "Users read their own interview" on public.assessment_interviews;
create policy "Users read their own interview"
  on public.assessment_interviews for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create their own interview" on public.assessment_interviews;
create policy "Users create their own interview"
  on public.assessment_interviews for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own interview" on public.assessment_interviews;
create policy "Users update their own interview"
  on public.assessment_interviews for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users delete their own interview" on public.assessment_interviews;
create policy "Users delete their own interview"
  on public.assessment_interviews for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_assessment_interview()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assessment_interviews_touch on public.assessment_interviews;
create trigger assessment_interviews_touch
  before update on public.assessment_interviews
  for each row execute function public.touch_assessment_interview();

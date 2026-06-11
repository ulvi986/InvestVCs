-- Replies to community posts. Authenticated users can read all replies and
-- create/delete their own.

create table if not exists public.community_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.community_post_replies enable row level security;

drop policy if exists "Authenticated can read all replies" on public.community_post_replies;
create policy "Authenticated can read all replies"
  on public.community_post_replies for select
  to authenticated
  using (true);

drop policy if exists "Users can create their own replies" on public.community_post_replies;
create policy "Users can create their own replies"
  on public.community_post_replies for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own replies" on public.community_post_replies;
create policy "Users can delete their own replies"
  on public.community_post_replies for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists community_post_replies_post_id_idx
  on public.community_post_replies (post_id, created_at asc);

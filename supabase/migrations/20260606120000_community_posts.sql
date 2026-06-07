-- Community feed: everyone (authenticated) can read all posts; users manage their own.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

drop policy if exists "Authenticated can read all posts" on public.community_posts;
create policy "Authenticated can read all posts"
  on public.community_posts for select
  to authenticated
  using (true);

drop policy if exists "Users can create their own posts" on public.community_posts;
create policy "Users can create their own posts"
  on public.community_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.community_posts;
create policy "Users can update their own posts"
  on public.community_posts for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.community_posts;
create policy "Users can delete their own posts"
  on public.community_posts for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

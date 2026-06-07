-- Community posts: optional image attachment.

-- 1) Column on community_posts
alter table public.community_posts add column if not exists image_url text;

-- 2) Public bucket for community post images
insert into storage.buckets (id, name, public)
values ('community', 'community', true)
on conflict (id) do nothing;

-- 3) Storage RLS policies on storage.objects (path layout: community/<user_id>/<file>)
drop policy if exists "Community images are publicly accessible" on storage.objects;
create policy "Community images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'community');

drop policy if exists "Users can upload their own community images" on storage.objects;
create policy "Users can upload their own community images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own community images" on storage.objects;
create policy "Users can update their own community images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own community images" on storage.objects;
create policy "Users can delete their own community images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

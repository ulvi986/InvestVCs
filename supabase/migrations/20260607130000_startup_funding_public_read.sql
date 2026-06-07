-- Public profiles show startup funding details to every signed-in member
-- (mirrors the "Authenticated users can read all profiles" policy).

drop policy if exists "Authenticated users can read all funding" on public.startup_funding;
create policy "Authenticated users can read all funding"
  on public.startup_funding for select
  to authenticated
  using (true);

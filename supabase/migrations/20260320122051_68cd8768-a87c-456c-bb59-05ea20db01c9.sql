
-- 1. Create role enum
create type public.app_role as enum ('admin', 'investor', 'startup');

-- 2. Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 3. Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
      and approved = true
  )
$$;

-- 4. RLS for user_roles
create policy "Users can read own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can read all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert roles"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update roles"
  on public.user_roles for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
  on public.user_roles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Users can insert own investor role"
  on public.user_roles for insert
  to authenticated
  with check (auth.uid() = user_id and role = 'investor' and approved = false);

-- 5. Create startup_vacancies table
create table public.startup_vacancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  startup_name text not null,
  country text not null,
  job_type text not null,
  startup_description text,
  job_description text not null,
  specialization text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.startup_vacancies enable row level security;

create policy "Anyone authenticated can read vacancies"
  on public.startup_vacancies for select
  to authenticated
  using (true);

create policy "Users can insert own vacancies"
  on public.startup_vacancies for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own vacancies"
  on public.startup_vacancies for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own vacancies"
  on public.startup_vacancies for delete
  to authenticated
  using (auth.uid() = user_id);

-- 6. Allow admins to read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- 7. Allow approved investors to read all profiles
create policy "Investors can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'investor'));

-- 8. Allow admins to read all evaluations
create policy "Admins can read all evaluations"
  on public.evaluations for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Investors can read all evaluations"
  on public.evaluations for select
  to authenticated
  using (public.has_role(auth.uid(), 'investor'));

-- 9. Allow admins/investors to read all financial_snapshots
create policy "Admins can read all snapshots"
  on public.financial_snapshots for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Investors can read all snapshots"
  on public.financial_snapshots for select
  to authenticated
  using (public.has_role(auth.uid(), 'investor'));

-- 10. Allow admins/investors to read all readiness_answers
create policy "Admins can read all readiness"
  on public.readiness_answers for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Investors can read all readiness"
  on public.readiness_answers for select
  to authenticated
  using (public.has_role(auth.uid(), 'investor'));

-- 11. Auto-assign admin role for specific email via trigger
create or replace function public.handle_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.email = 'usherifzade@std.beu.edu.az' then
    insert into public.user_roles (user_id, role, approved)
    values (NEW.id, 'admin', true)
    on conflict (user_id, role) do nothing;
  end if;
  return NEW;
end;
$$;

create trigger on_auth_user_created_admin
  after insert on auth.users
  for each row execute function public.handle_admin_role();

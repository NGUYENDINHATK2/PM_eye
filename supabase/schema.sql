-- =====================================================
-- PM_Eye — FULL RESET schema (RBAC multi-role)
-- Chạy trên Supabase SQL Editor (project trống hoặc sau khi drop).
-- =====================================================
-- Roles (JWT app_metadata.role + profiles.app_role):
--   admin   — full, gồm lương
--   manager — all projects, P&L, KHÔNG lương
--   pm      — projects.manager_id = mình, P&L, KHÔNG lương
--   member  — projects có allocation, KHÔNG tiền, KHÔNG lương
-- =====================================================

-- 0) DROP cũ (reset)
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;

create extension if not exists "pgcrypto";

-- =====================================================
-- 1. PROFILES — id = auth.users.id
-- =====================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  job_role text not null default 'Other',  -- FE / BA / QA … (chức danh)
  app_role text not null default 'member'
    check (app_role in ('admin', 'manager', 'pm', 'member')),
  -- Level kinh nghiệm + lực chiến (1–100) — dùng phân bổ, không phải lương
  level text not null default 'Junior'
    check (level in (
      'Intern', 'Fresher', 'Junior', 'Middle', 'Senior', 'Lead', 'Principal'
    )),
  power_score numeric not null default 50
    check (power_score >= 1 and power_score <= 100),
  base_salary numeric not null default 0,  -- admin-only (column grant)
  start_date date default current_date,
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  total_budget numeric not null default 0,
  consumed_before numeric not null default 0,
  revenue numeric not null default 0,
  billing_type text not null default 'fixed'
    check (billing_type in ('fixed', 'mm', 'tnm')),
  mm_rate numeric not null default 0,
  status text not null default 'planned'
    check (status in ('planned', 'ongoing', 'completed', 'paused')),
  start_date date,
  end_date date,
  description text,
  color text not null default '#0d9488',
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. PROJECT_PHASES
create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_name text not null,
  start_date date not null,
  end_date date not null,
  phase_budget numeric not null default 0,
  required_roles jsonb not null default '[]'::jsonb,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

-- 4. ALLOCATIONS
create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_id uuid references public.project_phases(id) on delete cascade,
  percent numeric not null default 1.0 check (percent >= 0 and percent <= 1),
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now()
);

-- 5. SALARY_HISTORY — admin only
create table public.salary_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  monthly_amount numeric not null,
  effective_from date not null,
  note text,
  created_at timestamptz not null default now()
);

-- 6. PROJECT_PAYMENTS
create table public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_name text,
  amount numeric not null,
  due_date date,
  paid_date date,
  status text not null default 'planned'
    check (status in ('planned', 'invoiced', 'paid')),
  note text,
  created_at timestamptz not null default now()
);

-- 7. OPERATING_EXPENSES
create table public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  phase_id uuid references public.project_phases(id) on delete set null,
  amount numeric not null,
  description text,
  category text not null default 'other',
  spent_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- 8. TEAMS — nhóm nhân sự (KHÔNG gắn dự án)
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  leader_id uuid references public.profiles(id) on delete set null,
  color text not null default '#0d9488',
  created_at timestamptz not null default now()
);

-- 9. TEAM_MEMBERS — mỗi người chỉ thuộc 1 team
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id),
  unique (user_id)
);

create index teams_leader_id_idx on public.teams (leader_id);
create index team_members_user_id_idx on public.team_members (user_id);

create index idx_alloc_user on public.allocations(user_id);
create index idx_alloc_project on public.allocations(project_id);
create index idx_alloc_dates on public.allocations(start_date, end_date);
create index idx_phase_project on public.project_phases(project_id);
create index idx_expense_project on public.operating_expenses(project_id);
create index idx_payment_project on public.project_payments(project_id);
create index idx_payment_due on public.project_payments(due_date);
create index idx_salary_profile_date on public.salary_history(profile_id, effective_from desc);
create index idx_projects_manager on public.projects(manager_id);
create index idx_profiles_app_role on public.profiles(app_role);

-- =====================================================
-- Role helpers (JWT app_metadata.role)
-- =====================================================
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_role() = 'admin';
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_role() in ('admin', 'manager');
$$;

create or replace function public.is_pm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_role() = 'pm';
$$;

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when public.app_role() in ('admin', 'manager') then true
      when public.app_role() = 'pm' then exists (
        select 1 from public.projects pr
        where pr.id = p_project_id and pr.manager_id = auth.uid()
      )
      when public.app_role() = 'member' then exists (
        select 1 from public.allocations a
        where a.project_id = p_project_id and a.user_id = auth.uid()
      )
      else false
    end;
$$;

create or replace function public.can_write_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when public.app_role() in ('admin', 'manager') then true
      when public.app_role() = 'pm' then exists (
        select 1 from public.projects pr
        where pr.id = p_project_id and pr.manager_id = auth.uid()
      )
      else false
    end;
$$;

-- Compat alias (old migrations / docs)
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

grant execute on function public.app_role() to authenticated, anon, service_role;
grant execute on function public.is_admin() to authenticated, anon, service_role;
grant execute on function public.is_manager() to authenticated, anon, service_role;
grant execute on function public.is_pm() to authenticated, anon, service_role;
grant execute on function public.is_app_admin() to authenticated, anon, service_role;
grant execute on function public.can_access_project(uuid) to authenticated, anon, service_role;
grant execute on function public.can_write_project(uuid) to authenticated, anon, service_role;

-- =====================================================
-- RLS
-- =====================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_phases enable row level security;
alter table public.allocations enable row level security;
alter table public.operating_expenses enable row level security;
alter table public.project_payments enable row level security;
alter table public.salary_history enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- PROFILES: member chỉ đọc chính; manager/pm/admin đọc roster
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.app_role() in ('admin', 'manager', 'pm')
  );

create policy "profiles_insert_admin" on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy "profiles_update_admin_manager" on public.profiles
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- PROJECTS
create policy "projects_select" on public.projects
  for select to authenticated
  using (public.can_access_project(id));

create policy "projects_insert" on public.projects
  for insert to authenticated
  with check (public.is_manager());

create policy "projects_update" on public.projects
  for update to authenticated
  using (public.can_write_project(id))
  with check (public.can_write_project(id));

create policy "projects_delete" on public.projects
  for delete to authenticated
  using (public.is_manager());

-- PHASES
create policy "phases_select" on public.project_phases
  for select to authenticated
  using (public.can_access_project(project_id));

create policy "phases_write" on public.project_phases
  for all to authenticated
  using (public.can_write_project(project_id))
  with check (public.can_write_project(project_id));

-- ALLOCATIONS
create policy "alloc_select" on public.allocations
  for select to authenticated
  using (public.can_access_project(project_id));

create policy "alloc_write" on public.allocations
  for all to authenticated
  using (public.can_write_project(project_id))
  with check (public.can_write_project(project_id));

-- EXPENSES
create policy "expenses_select" on public.operating_expenses
  for select to authenticated
  using (
    project_id is null and public.is_manager()
    or project_id is not null and public.can_access_project(project_id)
      and public.app_role() in ('admin', 'manager', 'pm')
  );

create policy "expenses_write" on public.operating_expenses
  for all to authenticated
  using (
    (project_id is null and public.is_manager())
    or (project_id is not null and public.can_write_project(project_id))
  )
  with check (
    (project_id is null and public.is_manager())
    or (project_id is not null and public.can_write_project(project_id))
  );

-- PAYMENTS
create policy "payments_select" on public.project_payments
  for select to authenticated
  using (
    public.can_access_project(project_id)
    and public.app_role() in ('admin', 'manager', 'pm')
  );

create policy "payments_write" on public.project_payments
  for all to authenticated
  using (public.can_write_project(project_id))
  with check (public.can_write_project(project_id));

-- SALARY — admin only
create policy "salary_admin_all" on public.salary_history
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- TEAMS — org groups, không gắn dự án
create policy "teams_select" on public.teams
  for select to authenticated
  using (
    public.app_role() in ('admin', 'manager', 'pm')
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.user_id = auth.uid()
    )
  );

create policy "teams_write" on public.teams
  for all to authenticated
  using (public.app_role() in ('admin', 'manager'))
  with check (public.app_role() in ('admin', 'manager'));

create policy "team_members_select" on public.team_members
  for select to authenticated
  using (
    public.app_role() in ('admin', 'manager', 'pm')
    or user_id = auth.uid()
    or exists (
      select 1 from public.team_members tm2
      where tm2.team_id = team_members.team_id and tm2.user_id = auth.uid()
    )
  );

create policy "team_members_write" on public.team_members
  for all to authenticated
  using (public.app_role() in ('admin', 'manager'))
  with check (public.app_role() in ('admin', 'manager'));

-- =====================================================
-- Column privileges — che base_salary với non-admin
-- =====================================================
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.salary_history from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.project_phases from anon, authenticated;
revoke all on table public.allocations from anon, authenticated;
revoke all on table public.operating_expenses from anon, authenticated;
revoke all on table public.project_payments from anon, authenticated;
revoke all on table public.teams from anon, authenticated;
revoke all on table public.team_members from anon, authenticated;

-- profiles: authenticated được các cột non-salary
grant select (
  id, full_name, email, job_role, app_role,
  level, power_score,
  start_date, is_active, avatar_url, created_at
) on public.profiles to authenticated;

grant insert (
  id, full_name, email, job_role, app_role,
  level, power_score,
  start_date, is_active, avatar_url
) on public.profiles to authenticated;

grant update (
  full_name, email, job_role, app_role,
  level, power_score,
  start_date, is_active, avatar_url
) on public.profiles to authenticated;

grant delete on public.profiles to authenticated;

-- service_role: full access mọi bảng (API bootstrap / admin users)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
grant select (base_salary) on public.profiles to service_role;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_phases to authenticated;
grant select, insert, update, delete on public.allocations to authenticated;
grant select, insert, update, delete on public.operating_expenses to authenticated;
grant select, insert, update, delete on public.project_payments to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;

-- salary_history: không grant cho authenticated — chỉ service_role / admin qua API
-- (RLS vẫn có policy admin; cần grant SELECT cho authenticated để policy chạy)
grant select, insert, update, delete on public.salary_history to authenticated;

-- Cho admin đọc/ghi base_salary qua authenticated + is_admin policy:
-- Dùng function security definer để admin đọc lương từ API service role là chính.
-- Bổ sung grant base_salary chỉ khi cần client-side admin — API dùng service role.

grant usage on all sequences in schema public to authenticated, service_role;

-- Trigger: khi tạo auth user với metadata, có thể sync profile (optional helper)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, job_role, app_role, base_salary)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'job_role', 'Other'),
    coalesce(new.raw_app_meta_data ->> 'role', 'member'),
    coalesce((new.raw_user_meta_data ->> 'base_salary')::numeric, 0)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Đọc/tạo profile (security definer — bypass column GRANT / RLS)
create or replace function public.get_or_create_profile(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.profiles%rowtype;
  u auth.users%rowtype;
  v_role text;
  j jsonb;
  v_caller text;
begin
  v_caller := coalesce(auth.role(), '');

  if v_caller = 'authenticated'
     and (auth.uid() is null or p_user_id is distinct from auth.uid()) then
    raise exception 'forbidden';
  end if;

  select * into r from public.profiles where id = p_user_id;
  if not found then
    select * into u from auth.users where id = p_user_id;
    if not found then
      return null;
    end if;

    v_role := coalesce(u.raw_app_meta_data->>'role', 'member');
    if v_role not in ('admin', 'manager', 'pm', 'member') then
      v_role := 'member';
    end if;

    insert into public.profiles (
      id, full_name, email, job_role, app_role, base_salary, is_active
    ) values (
      u.id,
      coalesce(split_part(u.email, '@', 1), 'User'),
      u.email,
      case when v_role = 'admin' then 'BU Lead' else 'Member' end,
      v_role,
      0,
      true
    )
    on conflict (id) do update set email = excluded.email
    returning * into r;
  end if;

  j := to_jsonb(r);
  -- Che lương trừ admin JWT / service_role
  if v_caller = 'authenticated' and not public.is_admin() then
    j := j || jsonb_build_object('base_salary', 0);
  end if;
  return j;
end;
$$;

grant execute on function public.get_or_create_profile(uuid)
  to authenticated, service_role;

create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.get_or_create_profile(auth.uid());
$$;

grant execute on function public.get_my_profile() to authenticated, service_role, anon;

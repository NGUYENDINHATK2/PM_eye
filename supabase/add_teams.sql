-- =====================================================
-- PM_Eye — Teams (nhóm nhân sự, KHÔNG gắn dự án)
-- Chạy 1 lần trên SQL Editor — không xoá data hiện có
-- =====================================================
-- Model:
--   teams          — tên, mô tả, màu, leader_id (1 leader / team)
--   team_members   — thành viên; mỗi người chỉ thuộc 1 team
-- =====================================================

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  leader_id uuid references public.profiles(id) on delete set null,
  color text not null default '#0d9488',
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id),
  unique (user_id)  -- 1 người = 1 team
);

create index if not exists teams_leader_id_idx on public.teams (leader_id);
create index if not exists team_members_user_id_idx on public.team_members (user_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams
  for select to authenticated
  using (
    public.app_role() in ('admin', 'manager', 'pm')
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "teams_write" on public.teams;
create policy "teams_write" on public.teams
  for all to authenticated
  using (public.app_role() in ('admin', 'manager'))
  with check (public.app_role() in ('admin', 'manager'));

drop policy if exists "team_members_select" on public.team_members;
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

drop policy if exists "team_members_write" on public.team_members;
create policy "team_members_write" on public.team_members
  for all to authenticated
  using (public.app_role() in ('admin', 'manager'))
  with check (public.app_role() in ('admin', 'manager'));

grant select, insert, update, delete on public.teams to authenticated, service_role;
grant select, insert, update, delete on public.team_members to authenticated, service_role;

select 'OK — teams tables ready' as status;

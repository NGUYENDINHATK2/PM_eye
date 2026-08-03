-- PM Eye: project ops nâng cấp (additive — không xoá data)
-- DB đang chạy: chạy file này trên SQL Editor.
-- DB mới / reset: đã gộp vào schema.sql — không cần chạy lại.
-- 1) projects.team_id — gắn team phụ trách
-- 2) project_risks — blocker / rủi ro
-- 3) phase status → planning|active|done

-- ── team trên dự án ──────────────────────────────────────────
alter table public.projects
  add column if not exists team_id uuid references public.teams (id) on delete set null;

create index if not exists projects_team_id_idx on public.projects (team_id);

comment on column public.projects.team_id is 'Team phụ trách chính (org team)';

-- ── rủi ro / blocker ─────────────────────────────────────────
create table if not exists public.project_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  kind text not null default 'risk'
    check (kind in ('blocker', 'risk')),
  severity text not null default 'warn'
    check (severity in ('critical', 'warn', 'info')),
  status text not null default 'open'
    check (status in ('open', 'done')),
  owner_id uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists project_risks_project_id_idx
  on public.project_risks (project_id);

create index if not exists project_risks_open_idx
  on public.project_risks (project_id)
  where status = 'open';

alter table public.project_risks enable row level security;

drop policy if exists "project_risks_select_auth" on public.project_risks;
create policy "project_risks_select_auth"
  on public.project_risks for select
  to authenticated
  using (true);

drop policy if exists "project_risks_write_staff" on public.project_risks;
create policy "project_risks_write_staff"
  on public.project_risks for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.app_role in ('admin', 'manager', 'pm')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.app_role in ('admin', 'manager', 'pm')
    )
  );

grant select, insert, update, delete on public.project_risks to authenticated;
grant all on public.project_risks to service_role;

-- Chuẩn hoá phase status cũ → planning|active|done (best-effort)
update public.project_phases
set status = case
  when lower(coalesce(status, '')) in ('done', 'completed', 'closed') then 'done'
  when lower(coalesce(status, '')) in ('active', 'ongoing', 'in_progress', 'doing') then 'active'
  else 'planning'
end
where coalesce(status, '') !~* '^(planning|active|done)$';

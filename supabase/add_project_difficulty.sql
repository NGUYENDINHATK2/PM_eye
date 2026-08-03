-- =====================================================
-- PM_Eye — Độ khó dự án (force-fit vs lực chiến team)
-- Chạy 1 lần — không xoá data
-- =====================================================

alter table public.projects
  add column if not exists difficulty numeric not null default 0;

alter table public.projects drop constraint if exists projects_difficulty_check;
alter table public.projects
  add constraint projects_difficulty_check
  check (difficulty >= 0 and difficulty <= 100);

comment on column public.projects.difficulty is
  'Độ khó = mức LC trung bình team cần (0=chưa set, 1–100). Fit = P_avg / difficulty.';

grant select (difficulty) on public.projects to authenticated;
grant update (difficulty) on public.projects to authenticated;
grant insert (difficulty) on public.projects to authenticated;

select 'OK — project.difficulty ready' as status;

-- =====================================================
-- PM_Eye — Level + lực chiến (power_score)
-- Chạy 1 lần trên SQL Editor — không xoá data
-- =====================================================
-- level: Intern / Fresher / Junior / Middle / Senior / Lead / Principal
-- power_score: 1–100 (chỉ số lực chiến để phân bổ)
-- =====================================================

alter table public.profiles
  add column if not exists level text not null default 'Junior';

alter table public.profiles
  add column if not exists power_score numeric not null default 50;

-- Constraint level (drop cũ nếu re-run)
alter table public.profiles drop constraint if exists profiles_level_check;
alter table public.profiles
  add constraint profiles_level_check
  check (level in (
    'Intern', 'Fresher', 'Junior', 'Middle', 'Senior', 'Lead', 'Principal'
  ));

alter table public.profiles drop constraint if exists profiles_power_score_check;
alter table public.profiles
  add constraint profiles_power_score_check
  check (power_score >= 1 and power_score <= 100);

-- Backfill: job_role = Intern → level Intern (nếu còn default Junior)
update public.profiles
set level = 'Intern', power_score = 20
where lower(job_role) = 'intern' and level = 'Junior';

-- Seed power theo level nếu vẫn đang default 50 nhưng level khác Junior
update public.profiles set power_score = 20 where level = 'Intern' and power_score = 50;
update public.profiles set power_score = 35 where level = 'Fresher' and power_score = 50;
update public.profiles set power_score = 65 where level = 'Middle' and power_score = 50;
update public.profiles set power_score = 80 where level = 'Senior' and power_score = 50;
update public.profiles set power_score = 90 where level = 'Lead' and power_score = 50;
update public.profiles set power_score = 100 where level = 'Principal' and power_score = 50;

-- Column grants: authenticated được đọc/sửa level + power (không phải lương)
grant select (level, power_score) on public.profiles to authenticated;
grant update (level, power_score) on public.profiles to authenticated;
grant all on table public.profiles to service_role;

select 'OK — level + power_score ready' as status;

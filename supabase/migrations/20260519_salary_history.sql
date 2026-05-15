-- Migration: salary history — track salary changes over time per profile.
-- Run in Supabase SQL Editor.

create table if not exists public.salary_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  monthly_amount numeric not null,
  effective_from date not null,
  note text,
  created_at timestamptz default now()
);

comment on table public.salary_history is
  'Mỗi row = 1 mức lương có hiệu lực từ effective_from cho profile_id.
   Tính chi phí lương lịch sử: lấy entry có effective_from lớn nhất ≤ ngày cần tính.';

create index if not exists idx_salary_profile_date
  on public.salary_history(profile_id, effective_from desc);

alter table public.salary_history enable row level security;

drop policy if exists "auth_all_salary_history" on public.salary_history;
create policy "auth_all_salary_history" on public.salary_history
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed: với mỗi profile đang có base_salary > 0 mà chưa có history → tạo 1 entry
-- với effective_from = start_date (hoặc current_date nếu null)
insert into public.salary_history (profile_id, monthly_amount, effective_from, note)
select
  p.id,
  p.base_salary,
  coalesce(p.start_date, current_date),
  'Mức ban đầu (auto-seed từ migration)'
from public.profiles p
where p.base_salary > 0
  and not exists (
    select 1 from public.salary_history h where h.profile_id = p.id
  );

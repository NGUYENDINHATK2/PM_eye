-- Migration: add revenue tracking + payment milestones
-- Run in Supabase SQL Editor.

-- 1. Revenue + billing fields on projects
alter table public.projects
  add column if not exists revenue numeric not null default 0,
  add column if not exists billing_type text not null default 'fixed',
  add column if not exists mm_rate numeric not null default 0;

comment on column public.projects.revenue is
  'Doanh thu dự kiến / hợp đồng khách trả. Đơn vị VND.';
comment on column public.projects.billing_type is
  'fixed = giá trọn gói · mm = man-month · tnm = time & materials';
comment on column public.projects.mm_rate is
  'Đơn giá VND / man-month — dùng cho billing_type = mm hoặc tnm.';

alter table public.projects
  drop constraint if exists projects_billing_type_check;
alter table public.projects
  add constraint projects_billing_type_check
  check (billing_type in ('fixed', 'mm', 'tnm'));

-- 2. Payment milestones (khách trả nhiều đợt)
create table if not exists public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_name text,
  amount numeric not null,
  due_date date,
  paid_date date,
  status text not null default 'planned',
  note text,
  created_at timestamptz default now()
);

alter table public.project_payments
  drop constraint if exists project_payments_status_check;
alter table public.project_payments
  add constraint project_payments_status_check
  check (status in ('planned', 'invoiced', 'paid'));

create index if not exists idx_payment_project on public.project_payments(project_id);
create index if not exists idx_payment_due on public.project_payments(due_date);

-- RLS
alter table public.project_payments enable row level security;

drop policy if exists "auth_all_project_payments" on public.project_payments;
create policy "auth_all_project_payments" on public.project_payments
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

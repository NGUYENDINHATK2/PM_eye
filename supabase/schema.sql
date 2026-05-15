-- =====================================================
-- PM_Eye — Project / Cost / People management schema
-- Run this in Supabase SQL Editor once.
-- =====================================================

-- 1. PROFILES — nhân sự
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  role text not null,                -- FE Dev / BE Dev / QA / Designer / PM ...
  base_salary numeric not null default 0,  -- chi phí công ty trả /tháng
  start_date date default current_date,
  is_active boolean default true,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. PROJECTS — dự án
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  total_budget numeric not null default 0,        -- cap chi phí nội bộ (optional)
  consumed_before numeric not null default 0,     -- đã tiêu trước khi dùng PM_Eye
  revenue numeric not null default 0,             -- doanh thu khách trả
  billing_type text not null default 'fixed',     -- fixed / mm / tnm
  mm_rate numeric not null default 0,             -- đơn giá VND/MM
  status text not null default 'planned',  -- planned / ongoing / completed / paused
  start_date date,
  end_date date,
  description text,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- 3. PROJECT_PHASES — giai đoạn / đợt
create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_name text not null,
  start_date date not null,
  end_date date not null,
  phase_budget numeric default 0,
  required_roles jsonb default '[]'::jsonb,  -- ví dụ: [{"role":"FE Dev","count":2},{"role":"QA","count":1}]
  status text default 'planned',
  created_at timestamptz default now()
);

-- 4. ALLOCATIONS — phân bổ nhân sự
create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_id uuid references public.project_phases(id) on delete cascade,
  percent numeric not null default 1.0 check (percent >= 0 and percent <= 1),
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz default now()
);

-- 5b. PROJECT_PAYMENTS — khách trả nhiều đợt
create table if not exists public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_name text,
  amount numeric not null,
  due_date date,
  paid_date date,
  status text not null default 'planned', -- planned / invoiced / paid
  note text,
  created_at timestamptz default now()
);

-- 5. OPERATING_EXPENSES — chi phí vận hành ngoài lương
create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  phase_id uuid references public.project_phases(id) on delete set null,
  amount numeric not null,
  description text,
  category text default 'other',  -- server / license / outsource / travel / other
  spent_date date not null default current_date,
  created_at timestamptz default now()
);

-- Indexes for speed
create index if not exists idx_alloc_user on public.allocations(user_id);
create index if not exists idx_alloc_project on public.allocations(project_id);
create index if not exists idx_alloc_dates on public.allocations(start_date, end_date);
create index if not exists idx_phase_project on public.project_phases(project_id);
create index if not exists idx_expense_project on public.operating_expenses(project_id);
create index if not exists idx_payment_project on public.project_payments(project_id);
create index if not exists idx_payment_due on public.project_payments(due_date);

-- =====================================================
-- RLS — chỉ cho phép user đã đăng nhập đọc/ghi
-- =====================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_phases enable row level security;
alter table public.allocations enable row level security;
alter table public.operating_expenses enable row level security;
alter table public.project_payments enable row level security;

-- Policy: bất kỳ user đã auth được full access (tool nội bộ)
do $$
declare
  t text;
begin
  foreach t in array array['profiles','projects','project_phases','allocations','operating_expenses','project_payments']
  loop
    execute format('drop policy if exists "auth_all_%s" on public.%I;', t, t);
    execute format($f$
      create policy "auth_all_%s" on public.%I
        for all
        using (auth.role() = 'authenticated')
        with check (auth.role() = 'authenticated');
    $f$, t, t);
  end loop;
end$$;

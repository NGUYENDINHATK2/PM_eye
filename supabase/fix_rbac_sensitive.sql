-- =====================================================
-- PM_Eye — Harden RBAC (lương / dữ liệu nhạy cảm)
-- Chạy 1 lần trên SQL Editor
-- =====================================================

-- 1) Drop policy mở quá rộng (migration cũ)
drop policy if exists "auth_all_salary_history" on public.salary_history;
drop policy if exists "auth_all_project_payments" on public.project_payments;
drop policy if exists "auth_all_operating_expenses" on public.operating_expenses;

-- 2) salary_history: chỉ admin
drop policy if exists "salary_admin_all" on public.salary_history;
create policy "salary_admin_all" on public.salary_history
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3) profiles SELECT: member chỉ đọc chính; manager/pm/admin đọc roster
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.app_role() in ('admin', 'manager', 'pm')
  );

-- 4) RPC che base_salary (trừ admin JWT / service_role)
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
  if v_caller = 'authenticated' and not public.is_admin() then
    j := j || jsonb_build_object('base_salary', 0);
  end if;
  return j;
end;
$$;

grant execute on function public.get_or_create_profile(uuid)
  to authenticated, service_role;

-- 5) profiles: authenticated KHÔNG đọc/ghi base_salary (chỉ service_role / API admin)
revoke all on table public.profiles from authenticated;
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

-- service_role vẫn full (bootstrap / admin API đọc lương)
grant all on table public.profiles to service_role;

-- Tiền dự án: che ở tầng API/bootstrap (stripProjectMoney) — không revoke
-- cột budget/revenue để manager/pm vẫn CRUD qua client.

select 'OK — RBAC sensitive hardened' as status;

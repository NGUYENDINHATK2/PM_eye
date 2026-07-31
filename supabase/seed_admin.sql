-- =====================================================
-- PM_Eye — ONE-SHOT seed ADMIN (chạy nguyên file)
-- Email: dinhatnguyen81@gmail.com
-- Điều kiện: đã chạy schema.sql + đã có user trên Auth
-- =====================================================

-- 1) Grants — service_role phải đọc/ghi được
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
grant select, insert, update, delete on table public.profiles to service_role;

-- 2) RLS: luôn đọc được profile của chính mình
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.app_role() in ('admin', 'manager', 'pm', 'member')
  );

-- 3) RPC: đọc/tạo profile — security definer (bypass column GRANT)
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
begin
  -- authenticated chỉ được lấy đúng uid của mình
  if auth.role() = 'authenticated'
     and (auth.uid() is null or p_user_id is distinct from auth.uid()) then
    raise exception 'forbidden';
  end if;

  select * into r from public.profiles where id = p_user_id;
  if found then
    return to_jsonb(r);
  end if;

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
  on conflict (id) do update set
    email = excluded.email
  returning * into r;

  return to_jsonb(r);
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

grant execute on function public.get_my_profile()
  to authenticated, service_role;

-- 4) Seed admin theo email
do $$
declare
  v_email text := 'dinhatnguyen81@gmail.com';
  v_id uuid;
  v_name text;
begin
  select id, coalesce(split_part(email, '@', 1), 'Admin')
    into v_id, v_name
  from auth.users
  where lower(email) = lower(v_email);

  if v_id is null then
    raise exception
      'Không tìm thấy auth.users với email %. Tạo user trên Authentication trước.',
      v_email;
  end if;

  update auth.users
  set raw_app_meta_data =
        coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = v_id;

  insert into public.profiles (
    id, full_name, email, job_role, app_role, base_salary, is_active
  ) values (
    v_id, v_name, v_email, 'BU Lead', 'admin', 0, true
  )
  on conflict (id) do update set
    app_role = 'admin',
    is_active = true,
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  raise notice 'OK — admin: % (id=%)', v_email, v_id;
end $$;

-- 5) Kiểm tra
select id, email, full_name, app_role, is_active,
       public.get_or_create_profile(id) as via_rpc
from public.profiles
where lower(email) = lower('dinhatnguyen81@gmail.com');

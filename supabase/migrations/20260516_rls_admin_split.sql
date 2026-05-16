-- =====================================================
-- PM_Eye — Siết RLS theo role admin/member
-- Chạy migration này trên Supabase SQL Editor.
-- =====================================================
--
-- Sau khi chạy:
--   - Bảng nhạy cảm (operating_expenses, project_payments, salary_history)
--     CHỈ admin được SELECT/INSERT/UPDATE/DELETE.
--   - Các bảng còn lại (profiles, projects, project_phases, allocations):
--     mọi user đã đăng nhập có thể SELECT (đọc), chỉ admin được ghi.
--
-- Cách set admin:
--   1) Vào Supabase Dashboard → Authentication → Users → chọn user
--      → tab "User App Metadata" → set:
--         { "role": "admin" }
--      App metadata KHÔNG cho user tự đổi → an toàn.
--   2) Hoặc dùng email allowlist trong Next.js env (ADMIN_EMAILS=a@x.com,b@y.com)
--      cho API layer; nhưng RLS chỉ dùng app_metadata nên BẮT BUỘC set ở
--      dashboard nếu muốn user đó query DB trực tiếp được.

-- 1. Helper function — đọc app_metadata.role từ JWT
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

grant execute on function public.is_app_admin() to authenticated, anon;

-- 2. Xoá các policy "auth_all_*" cũ (cho phép mọi user authenticated full access)
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','projects','project_phases','allocations',
    'operating_expenses','project_payments','salary_history'
  ] loop
    execute format('drop policy if exists "auth_all_%s" on public.%I;', t, t);
    -- xoá luôn các policy generated bởi migration này nếu re-run
    execute format('drop policy if exists "select_authed_%s" on public.%I;', t, t);
    execute format('drop policy if exists "admin_all_%s" on public.%I;', t, t);
  end loop;
end$$;

-- 3. SELECT cho bảng không nhạy cảm — mọi user đã auth
create policy "select_authed_profiles" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "select_authed_projects" on public.projects
  for select using (auth.role() = 'authenticated');
create policy "select_authed_project_phases" on public.project_phases
  for select using (auth.role() = 'authenticated');
create policy "select_authed_allocations" on public.allocations
  for select using (auth.role() = 'authenticated');

-- 4. ALL (read+write) admin-only cho mọi bảng.
-- Với bảng không nhạy cảm: SELECT đi qua policy (3) (OR semantics) → vẫn cho read.
-- Với bảng nhạy cảm: KHÔNG có policy SELECT khác → chỉ admin đọc được.
create policy "admin_all_profiles" on public.profiles
  for all using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admin_all_projects" on public.projects
  for all using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admin_all_project_phases" on public.project_phases
  for all using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admin_all_allocations" on public.allocations
  for all using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admin_all_operating_expenses" on public.operating_expenses
  for all using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admin_all_project_payments" on public.project_payments
  for all using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admin_all_salary_history" on public.salary_history
  for all using (public.is_app_admin()) with check (public.is_app_admin());

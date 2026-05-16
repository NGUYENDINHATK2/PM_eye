-- =====================================================
-- PM_Eye — RLS admin-only
-- Chạy migration này trên Supabase SQL Editor.
-- =====================================================
--
-- Sau khi chạy:
--   - TẤT CẢ bảng (profiles, projects, project_phases, allocations,
--     operating_expenses, project_payments, salary_history)
--     CHỈ admin được SELECT/INSERT/UPDATE/DELETE.
--   - User không phải admin (kể cả đã đăng nhập) sẽ KHÔNG đọc được
--     bất kỳ bảng nào qua Supabase client.
--
-- Cách set admin:
--   1) Vào Supabase Dashboard → Authentication → Users → chọn user
--      → tab "User App Metadata" → set:
--         { "role": "admin" }
--      App metadata user KHÔNG tự đổi được → an toàn cho việc gate.
--   2) Hoặc đồng bộ với Next.js layer (ADMIN_EMAILS env) — nhưng RLS
--      bắt buộc đọc app_metadata.role nên BẮT BUỘC set ở dashboard
--      để query DB pass.
--
-- Re-run an toàn: migration tự drop policy cũ trước khi tạo lại.

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

-- 2. Xoá MỌI policy có thể tồn tại trên các bảng này (auth_all_* từ
--    schema.sql gốc, select_authed_* / admin_all_* từ các lần migrate
--    trước). Đảm bảo state cuối cùng chỉ có admin_all_*.
do $$
declare
  t text;
  pol record;
begin
  foreach t in array array[
    'profiles','projects','project_phases','allocations',
    'operating_expenses','project_payments','salary_history'
  ] loop
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format(
        'drop policy if exists %I on public.%I;',
        pol.policyname, t
      );
    end loop;
  end loop;
end$$;

-- 3. ALL (read + write) admin-only cho TOÀN BỘ bảng.
-- Không tạo bất kỳ policy SELECT nào khác → non-admin không đọc được.
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

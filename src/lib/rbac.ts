import type { AppRole, Profile, Project } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export type { AppRole };
export const APP_ROLES: AppRole[] = ["admin", "manager", "pm", "member"];

export function isAppRole(v: unknown): v is AppRole {
  return typeof v === "string" && (APP_ROLES as string[]).includes(v);
}

/**
 * Role hiệu lực.
 * Ưu tiên profile.app_role (DB) — tránh JWT cũ còn claim admin khi đã bị hạ quyền.
 * Fallback: JWT app_metadata.role → ADMIN_EMAILS.
 */
export function roleFromUser(
  user: User | null | undefined,
  profileRole?: string | null
): AppRole | null {
  if (isAppRole(profileRole)) return profileRole;
  const meta = user?.app_metadata as { role?: string } | undefined;
  if (isAppRole(meta?.role)) return meta.role;
  // Legacy ADMIN_EMAILS allowlist → admin
  if (user?.email && adminEmailSet().has(user.email.toLowerCase())) {
    return "admin";
  }
  return null;
}

/** Module nào role được vào (route guard). */
export function canAccessEmployees(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "manager" || role === "pm";
}

export function canAccessTeams(role: AppRole | null | undefined): boolean {
  return canAccessEmployees(role);
}

/** Tạo / sửa / xoá team + thành viên */
export function canWriteTeams(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

export function canAccessExpenses(role: AppRole | null | undefined): boolean {
  return canViewMoney(role);
}

export function canAccessInsights(role: AppRole | null | undefined): boolean {
  return canViewMoney(role);
}

export function canAccessUsersAdmin(role: AppRole | null | undefined): boolean {
  return role === "admin";
}

function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function canViewSalary(role: AppRole | null | undefined): boolean {
  return role === "admin";
}

export function canViewMoney(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "manager" || role === "pm";
}

export function canManageUsers(role: AppRole | null | undefined): boolean {
  return role === "admin";
}

export function canWriteAllProjects(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

export function canWriteProject(
  role: AppRole | null | undefined,
  project: Project,
  userId: string
): boolean {
  if (role === "admin" || role === "manager") return true;
  if (role === "pm") return project.manager_id === userId;
  return false;
}

/** Lọc project ids theo role. */
export function filterProjectsForRole(
  projects: Project[],
  role: AppRole,
  userId: string,
  allocatedProjectIds: Set<string>
): Project[] {
  if (role === "admin" || role === "manager") return projects;
  if (role === "pm") {
    return projects.filter((p) => p.manager_id === userId);
  }
  // member
  return projects.filter((p) => allocatedProjectIds.has(p.id));
}

export function stripProfileSalary<T extends Profile>(
  p: T,
  role: AppRole
): T {
  if (canViewSalary(role)) return p;
  return { ...p, base_salary: 0 };
}

export function stripProjectMoney<T extends Project>(
  p: T,
  role: AppRole
): T {
  if (canViewMoney(role)) return p;
  return {
    ...p,
    total_budget: 0,
    consumed_before: 0,
    revenue: 0,
    mm_rate: 0,
  };
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Quản lý";
    case "pm":
      return "PM";
    case "member":
      return "Member";
  }
}

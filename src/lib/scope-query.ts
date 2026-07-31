import type { AppRole, Allocation, Profile, Project } from "@/types/database";

/** Lọc profiles giống bootstrap — member chỉ self; pm teammates. */
export function scopeProfiles(
  profiles: Profile[],
  role: AppRole,
  userId: string,
  allocations: Allocation[],
  projects: Project[]
): Profile[] {
  if (role === "admin" || role === "manager") return profiles;
  if (role === "member") {
    return profiles.filter((p) => p.id === userId);
  }
  // pm
  const userIds = new Set(allocations.map((a) => a.user_id));
  userIds.add(userId);
  for (const p of projects) {
    if (p.manager_id) userIds.add(p.manager_id);
  }
  return profiles.filter((p) => userIds.has(p.id));
}

/** Member chỉ thấy allocation của mình. */
export function scopeAllocations(
  allocations: Allocation[],
  role: AppRole,
  userId: string
): Allocation[] {
  if (role === "member") {
    return allocations.filter((a) => a.user_id === userId);
  }
  return allocations;
}

import {
  canViewMoney,
  canViewSalary,
  filterProjectsForRole,
  stripProfileSalary,
  stripProjectMoney,
} from "@/lib/rbac";
import type {
  Allocation,
  AppRole,
  OperatingExpense,
  Profile,
  Project,
  ProjectPayment,
  ProjectPhase,
  SalaryHistory,
} from "@/types/database";

export type ScopedBootstrap = {
  user: {
    id: string;
    email: string | null;
    role: AppRole;
    isAdmin: boolean;
    canViewSalary: boolean;
    canViewMoney: boolean;
  };
  profiles: Profile[];
  projects: Project[];
  phases: ProjectPhase[];
  allocations: Allocation[];
  expenses: OperatingExpense[];
  payments: ProjectPayment[];
  salaryHistory: SalaryHistory[];
};

export function scopeBootstrapData(input: {
  role: AppRole;
  userId: string;
  email: string | null;
  profiles: Profile[];
  projects: Project[];
  phases: ProjectPhase[];
  allocations: Allocation[];
  expenses: OperatingExpense[];
  payments: ProjectPayment[];
  salaryHistory: SalaryHistory[];
}): ScopedBootstrap {
  const { role, userId } = input;

  const allocatedProjectIds = new Set(
    input.allocations.filter((a) => a.user_id === userId).map((a) => a.project_id)
  );

  let projects = filterProjectsForRole(
    input.projects,
    role,
    userId,
    allocatedProjectIds
  );
  const projectIds = new Set(projects.map((p) => p.id));

  let phases = input.phases.filter((ph) => projectIds.has(ph.project_id));
  let allocations = input.allocations.filter((a) =>
    projectIds.has(a.project_id)
  );

  // Member: chỉ plan của chính mình (+ dự án liên quan đã lọc ở trên)
  if (role === "member") {
    allocations = allocations.filter((a) => a.user_id === userId);
  }

  // Manager/admin: all profiles. PM: teammates on visible projects. Member: self
  let profiles = input.profiles;
  if (role === "member") {
    profiles = profiles.filter((p) => p.id === userId);
  } else if (role === "pm") {
    const userIds = new Set(allocations.map((a) => a.user_id));
    userIds.add(userId);
    for (const p of projects) {
      if (p.manager_id) userIds.add(p.manager_id);
    }
    profiles = profiles.filter((p) => userIds.has(p.id));
  }

  profiles = profiles.map((p) => stripProfileSalary(p, role));
  projects = projects.map((p) => stripProjectMoney(p, role));

  let expenses = input.expenses.filter(
    (e) => e.project_id == null || projectIds.has(e.project_id)
  );
  let payments = input.payments.filter((p) => projectIds.has(p.project_id));

  if (!canViewMoney(role)) {
    expenses = [];
    payments = [];
    phases = phases.map((ph) => ({ ...ph, phase_budget: 0 }));
  } else if (role === "pm") {
    // PM: no company-wide (null project) expenses
    expenses = expenses.filter((e) => e.project_id != null);
  }

  const salaryHistory = canViewSalary(role) ? input.salaryHistory : [];

  return {
    user: {
      id: userId,
      email: input.email,
      role,
      isAdmin: role === "admin",
      canViewSalary: canViewSalary(role),
      canViewMoney: canViewMoney(role),
    },
    profiles,
    projects,
    phases,
    allocations,
    expenses,
    payments,
    salaryHistory,
  };
}

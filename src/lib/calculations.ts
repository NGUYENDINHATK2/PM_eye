import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPayment,
  ProjectPhase,
  RequiredRole,
} from "@/types/database";
import { daysInMonth, monthKey, rangeOverlapDays } from "./utils";

// =====================================================
// Cost & load calculations
// =====================================================

/**
 * Cost a single allocation contributes to a given month.
 * cost = base_salary * percent * (overlapDays / daysInMonth)
 */
export function allocationCostForMonth(
  alloc: Allocation,
  profile: Profile,
  year: number,
  month: number // 1..12
): number {
  const dim = daysInMonth(year, month);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, dim);
  const aStart = new Date(alloc.start_date);
  const aEnd = new Date(alloc.end_date);
  const overlap = rangeOverlapDays(monthStart, monthEnd, aStart, aEnd);
  if (overlap <= 0) return 0;
  return profile.base_salary * alloc.percent * (overlap / dim);
}

/**
 * Current load of a user — sum of percents from all allocations
 * that are active right now (today between start and end).
 */
export function userLoadToday(
  userId: string,
  allocations: Allocation[],
  asOf: Date = new Date()
): number {
  let load = 0;
  for (const a of allocations) {
    if (a.user_id !== userId) continue;
    const s = new Date(a.start_date);
    const e = new Date(a.end_date);
    if (asOf < s || asOf > e) continue;
    load += Number(a.percent);
  }
  return load;
}

/**
 * Total team load per person for a given month (sum of percents from all
 * allocations that overlap the month, weighted by overlap days).
 */
export function userLoadForMonth(
  userId: string,
  allocations: Allocation[],
  year: number,
  month: number
): number {
  const dim = daysInMonth(year, month);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, dim);
  let load = 0;
  for (const a of allocations) {
    if (a.user_id !== userId) continue;
    const aStart = new Date(a.start_date);
    const aEnd = new Date(a.end_date);
    const overlap = rangeOverlapDays(monthStart, monthEnd, aStart, aEnd);
    if (overlap <= 0) continue;
    load += a.percent * (overlap / dim);
  }
  return load;
}

export type LoadStatus = "idle" | "underused" | "healthy" | "overloaded" | "critical";

export function loadStatus(load: number): LoadStatus {
  if (load === 0) return "idle";
  if (load < 0.5) return "underused";
  if (load <= 1.0) return "healthy";
  if (load <= 1.2) return "overloaded";
  return "critical";
}

export function loadStatusColor(s: LoadStatus): string {
  switch (s) {
    case "idle":
      return "bg-slate-400";
    case "underused":
      return "bg-sky-500";
    case "healthy":
      return "bg-emerald-500";
    case "overloaded":
      return "bg-amber-500";
    case "critical":
      return "bg-rose-600";
  }
}

export function loadStatusLabel(s: LoadStatus): string {
  switch (s) {
    case "idle":
      return "Bench / ngồi chơi";
    case "underused":
      return "Còn slot rảnh";
    case "healthy":
      return "Hợp lý";
    case "overloaded":
      return "Quá tải nhẹ";
    case "critical":
      return "Burnout!";
  }
}

// =====================================================
// Project P&L
// =====================================================

export type ProjectFinance = {
  budget: number;
  hasCap: boolean;       // true nếu total_budget > 0
  revenue: number;       // doanh thu khách trả
  hasRevenue: boolean;   // true nếu revenue > 0
  laborSpent: number;
  opSpent: number;
  consumedBefore: number;
  totalSpent: number;
  remaining: number;
  utilization: number;   // 0..n (chỉ có ý nghĩa khi hasCap)
  overBudget: boolean;   // chỉ true khi hasCap && totalSpent > budget
  profit: number;        // revenue - totalSpent
  margin: number;        // profit / revenue (có thể âm)
  marginStatus: "great" | "ok" | "thin" | "loss" | "n/a";
};

export function classifyMargin(margin: number, hasRevenue: boolean): ProjectFinance["marginStatus"] {
  if (!hasRevenue) return "n/a";
  if (margin < 0) return "loss";
  if (margin < 0.1) return "thin";
  if (margin < 0.3) return "ok";
  return "great";
}

export function projectFinance(
  project: Project,
  allocations: Allocation[],
  profilesById: Map<string, Profile>,
  expenses: OperatingExpense[],
  upTo: Date = new Date()
): ProjectFinance {
  const projAllocs = allocations.filter((a) => a.project_id === project.id);
  let laborSpent = 0;

  // Compute month-by-month from project earliest allocation start to upTo
  if (projAllocs.length > 0) {
    const earliest = projAllocs.reduce(
      (min, a) => (new Date(a.start_date) < min ? new Date(a.start_date) : min),
      new Date(projAllocs[0].start_date)
    );
    const cur = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    while (cur <= upTo) {
      const y = cur.getFullYear();
      const m = cur.getMonth() + 1;
      for (const a of projAllocs) {
        const p = profilesById.get(a.user_id);
        if (!p) continue;
        laborSpent += allocationCostForMonth(a, p, y, m);
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  const opSpent = expenses
    .filter(
      (e) =>
        e.project_id === project.id && new Date(e.spent_date) <= upTo
    )
    .reduce((s, e) => s + Number(e.amount), 0);

  const consumedBefore = Number(project.consumed_before ?? 0);
  const totalSpent = laborSpent + opSpent + consumedBefore;
  const hasCap = Number(project.total_budget) > 0;
  const remaining = hasCap ? project.total_budget - totalSpent : 0;
  const utilization = hasCap ? totalSpent / project.total_budget : 0;
  const revenue = Number(project.revenue ?? 0);
  const hasRevenue = revenue > 0;
  const profit = hasRevenue ? revenue - totalSpent : 0;
  const margin = hasRevenue ? profit / revenue : 0;
  return {
    budget: project.total_budget,
    hasCap,
    revenue,
    hasRevenue,
    laborSpent,
    opSpent,
    consumedBefore,
    totalSpent,
    remaining,
    utilization,
    overBudget: hasCap && totalSpent > project.total_budget,
    profit,
    margin,
    marginStatus: classifyMargin(margin, hasRevenue),
  };
}

// =====================================================
// Payment / AR helpers
// =====================================================

export type PaymentSummary = {
  totalPlanned: number;     // chưa invoice
  totalInvoiced: number;    // đã invoice, chưa thu
  totalPaid: number;        // đã thu
  totalOverdue: number;     // invoiced + quá due_date
  overdueCount: number;
  nextDue?: ProjectPayment;
};

export function paymentSummary(
  payments: ProjectPayment[],
  asOf: Date = new Date()
): PaymentSummary {
  let totalPlanned = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  let nextDue: ProjectPayment | undefined;

  for (const p of payments) {
    const amt = Number(p.amount);
    if (p.status === "paid") {
      totalPaid += amt;
      continue;
    }
    if (p.status === "invoiced") {
      totalInvoiced += amt;
      if (p.due_date && new Date(p.due_date) < asOf) {
        totalOverdue += amt;
        overdueCount++;
      }
      if (p.due_date) {
        if (!nextDue || (nextDue.due_date && p.due_date < nextDue.due_date)) {
          nextDue = p;
        }
      }
      continue;
    }
    // planned
    totalPlanned += amt;
    if (p.due_date) {
      if (!nextDue || (nextDue.due_date && p.due_date < nextDue.due_date)) {
        nextDue = p;
      }
    }
  }

  return {
    totalPlanned,
    totalInvoiced,
    totalPaid,
    totalOverdue,
    overdueCount,
    nextDue,
  };
}

// =====================================================
// Phase staffing gap analysis
// =====================================================

export type RoleGap = {
  role: string;
  required: number;
  assigned: number;
  missing: number;
};

export function phaseRoleGaps(
  phase: ProjectPhase,
  allocations: Allocation[],
  profilesById: Map<string, Profile>
): RoleGap[] {
  const required: RequiredRole[] = Array.isArray(phase.required_roles)
    ? phase.required_roles
    : [];

  const assignedByRole = new Map<string, number>();
  for (const a of allocations) {
    if (a.phase_id !== phase.id) continue;
    const p = profilesById.get(a.user_id);
    if (!p) continue;
    assignedByRole.set(p.role, (assignedByRole.get(p.role) ?? 0) + a.percent);
  }

  return required.map((r) => {
    const assigned = assignedByRole.get(r.role) ?? 0;
    const missing = Math.max(0, r.count - assigned);
    return { role: r.role, required: r.count, assigned, missing };
  });
}

// =====================================================
// Monthly cost timeline (for charts)
// =====================================================

export type MonthBucket = {
  key: string;
  label: string;
  labor: number;
  ops: number;
  total: number;
};

export function monthlyCostTimeline(
  allocations: Allocation[],
  profilesById: Map<string, Profile>,
  expenses: OperatingExpense[],
  months = 6,
  projectId?: string
): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = monthKey(d);
    const label = `T${m}/${String(y).slice(2)}`;

    let labor = 0;
    for (const a of allocations) {
      if (projectId && a.project_id !== projectId) continue;
      const p = profilesById.get(a.user_id);
      if (!p) continue;
      labor += allocationCostForMonth(a, p, y, m);
    }

    let ops = 0;
    for (const e of expenses) {
      if (projectId && e.project_id !== projectId) continue;
      const ed = new Date(e.spent_date);
      if (ed.getFullYear() === y && ed.getMonth() + 1 === m) {
        ops += Number(e.amount);
      }
    }

    buckets.push({ key, label, labor, ops, total: labor + ops });
  }
  return buckets;
}

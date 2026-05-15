import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPayment,
  ProjectPhase,
  RequiredRole,
  SalaryHistory,
} from "@/types/database";
import { daysInMonth, monthKey, rangeOverlapDays } from "./utils";

// =====================================================
// Cost & load calculations
// =====================================================

/**
 * Lương 1 nhân sự tại 1 ngày cụ thể, dựa trên salary_history.
 * Lấy entry có effective_from lớn nhất ≤ date. Nếu không có entry nào trước
 * ngày đó → trả `fallback` (thường = profile.base_salary).
 */
export function salaryAt(
  profileId: string,
  date: Date,
  salaryHistory: SalaryHistory[],
  fallback = 0
): number {
  const ds = date.toISOString().slice(0, 10);
  let best: SalaryHistory | null = null;
  for (const h of salaryHistory) {
    if (h.profile_id !== profileId) continue;
    if (h.effective_from > ds) continue;
    if (!best || h.effective_from > best.effective_from) {
      best = h;
    }
  }
  return best ? Number(best.monthly_amount) : fallback;
}

/**
 * Chi phí 1 allocation đóng góp vào 1 tháng.
 *
 * Cũ: cost = base_salary × percent × (overlapDays / daysInMonth)
 * Mới: iterate từng ngày overlap, dùng đúng lương tại ngày đó theo salary_history.
 *      cost = Σ (salaryAtDay / daysInMonth × percent)
 *
 * → Nếu lương thay đổi giữa tháng (vd Sơn 10M → 15M từ 15/3) thì tháng 3 sẽ
 *    được tính chính xác chứ không phải mức nào áp dụng cho cả tháng.
 *
 * salaryHistory mặc định = [] để backward compat (sẽ dùng profile.base_salary).
 */
export function allocationCostForMonth(
  alloc: Allocation,
  profile: Profile,
  year: number,
  month: number, // 1..12
  salaryHistory: SalaryHistory[] = []
): number {
  const dim = daysInMonth(year, month);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, dim);
  const aStart = new Date(alloc.start_date);
  const aEnd = new Date(alloc.end_date);

  const start = aStart > monthStart ? aStart : monthStart;
  const end = aEnd < monthEnd ? aEnd : monthEnd;
  if (end < start) return 0;

  const baseFallback = Number(profile.base_salary);
  let cost = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const salary = salaryAt(profile.id, cur, salaryHistory, baseFallback);
    cost += (salary / dim) * Number(alloc.percent);
    cur.setDate(cur.getDate() + 1);
  }
  return cost;
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
 * Tìm peak load (đỉnh tải) của 1 user trong khoảng [rangeStart, rangeEnd],
 * có thể giả lập thêm 1 allocation mới (addPercent) và loại trừ 1 allocation
 * đang edit (excludeAllocId). Trả về { date, load } tại ngày đỉnh.
 *
 * Cốt lõi: load tại 1 ngày = tổng percent của tất cả allocation active hôm đó.
 * Peak luôn xảy ra tại 1 trong các "biên" (start/end) của các allocation, nên
 * chỉ cần check tại các biên thay vì iterate từng ngày.
 */
export function userPeakLoad(
  userId: string,
  allocations: Allocation[],
  rangeStart: Date,
  rangeEnd: Date,
  addPercent = 0,
  excludeAllocId?: string
): { date: Date; load: number } | null {
  const userAllocs = allocations.filter(
    (a) =>
      a.user_id === userId &&
      a.id !== excludeAllocId &&
      new Date(a.end_date) >= rangeStart &&
      new Date(a.start_date) <= rangeEnd
  );
  if (userAllocs.length === 0 && addPercent === 0) return null;

  // Candidates: rangeStart + clamped start/end của các allocation overlap range
  const candidates: Date[] = [new Date(rangeStart), new Date(rangeEnd)];
  for (const a of userAllocs) {
    const s = new Date(a.start_date);
    const e = new Date(a.end_date);
    if (s >= rangeStart && s <= rangeEnd) candidates.push(s);
    if (e >= rangeStart && e <= rangeEnd) candidates.push(e);
  }

  let maxLoad = 0;
  let maxDate = new Date(rangeStart);
  for (const d of candidates) {
    let load = addPercent;
    for (const a of userAllocs) {
      const s = new Date(a.start_date);
      const e = new Date(a.end_date);
      if (d >= s && d <= e) load += Number(a.percent);
    }
    if (load > maxLoad) {
      maxLoad = load;
      maxDate = d;
    }
  }
  return { date: maxDate, load: maxLoad };
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
  upTo: Date = new Date(),
  salaryHistory: SalaryHistory[] = []
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
        laborSpent += allocationCostForMonth(a, p, y, m, salaryHistory);
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

  // Dedupe required by role name (sum counts) — tránh trùng key trên UI
  const requiredByRole = new Map<string, number>();
  for (const r of required) {
    if (!r?.role) continue;
    requiredByRole.set(r.role, (requiredByRole.get(r.role) ?? 0) + Number(r.count || 0));
  }

  const assignedByRole = new Map<string, number>();
  for (const a of allocations) {
    if (a.phase_id !== phase.id) continue;
    const p = profilesById.get(a.user_id);
    if (!p) continue;
    assignedByRole.set(p.role, (assignedByRole.get(p.role) ?? 0) + Number(a.percent));
  }

  const result: RoleGap[] = [];
  for (const [role, count] of requiredByRole) {
    const assigned = assignedByRole.get(role) ?? 0;
    const missing = Math.max(0, count - assigned);
    result.push({ role, required: count, assigned, missing });
  }
  return result;
}

// =====================================================
// Period cost (week/month/custom range) — universal cost calc
// =====================================================

export type PeriodCost = {
  key: string;
  label: string;
  short: string; // short label cho chart x-axis
  start: Date;
  end: Date;
  labor: number;
  ops: number;
  total: number;
  /** Δ so với kỳ liền trước (signed). 0 nếu là kỳ đầu tiên. */
  deltaTotal: number;
  /** Δ % so với kỳ liền trước. null nếu kỳ trước = 0. */
  deltaPct: number | null;
};

/**
 * Tính chi phí (lương + vận hành) cho một khoảng [start, end] tuỳ ý,
 * dùng đúng mức lương lịch sử theo từng ngày.
 */
function costInRange(
  start: Date,
  end: Date,
  allocations: Allocation[],
  profilesById: Map<string, Profile>,
  expenses: OperatingExpense[],
  salaryHistory: SalaryHistory[],
  projectId?: string
): { labor: number; ops: number } {
  let labor = 0;
  for (const a of allocations) {
    if (projectId && a.project_id !== projectId) continue;
    const profile = profilesById.get(a.user_id);
    if (!profile) continue;
    const aStart = new Date(a.start_date);
    const aEnd = new Date(a.end_date);
    const s = aStart > start ? aStart : start;
    const e = aEnd < end ? aEnd : end;
    if (e < s) continue;
    const cur = new Date(s);
    while (cur <= e) {
      const dim = daysInMonth(cur.getFullYear(), cur.getMonth() + 1);
      const salary = salaryAt(
        profile.id,
        cur,
        salaryHistory,
        Number(profile.base_salary)
      );
      labor += (salary / dim) * Number(a.percent);
      cur.setDate(cur.getDate() + 1);
    }
  }
  let ops = 0;
  for (const e of expenses) {
    if (projectId && e.project_id !== projectId) continue;
    const ed = new Date(e.spent_date);
    if (ed >= start && ed <= end) ops += Number(e.amount);
  }
  return { labor, ops };
}

/**
 * Sinh dãy kỳ (tháng / tuần) lùi từ hiện tại, mỗi kỳ kèm chi phí + delta.
 */
export function periodCostTimeline(
  granularity: "week" | "month",
  count: number,
  allocations: Allocation[],
  profilesById: Map<string, Profile>,
  expenses: OperatingExpense[],
  salaryHistory: SalaryHistory[] = [],
  projectId?: string
): PeriodCost[] {
  const now = new Date();
  const periods: { start: Date; end: Date; key: string; label: string; short: string }[] = [];

  if (granularity === "month") {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      periods.push({
        start,
        end,
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
        label: `Tháng ${m + 1}/${y}`,
        short: `T${m + 1}`,
      });
    }
  } else {
    // weekly: Mon → Sun
    const today = new Date(now);
    const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon
    const thisMonday = new Date(today);
    thisMonday.setHours(0, 0, 0, 0);
    thisMonday.setDate(today.getDate() - dayOfWeek);
    for (let i = count - 1; i >= 0; i--) {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const wk = isoWeekNumber(start);
      periods.push({
        start,
        end,
        key: `${start.getFullYear()}-W${String(wk).padStart(2, "0")}`,
        label: `Tuần ${wk}, ${start.getFullYear()} (${formatDM(start)}–${formatDM(end)})`,
        short: `W${wk}`,
      });
    }
  }

  // Compute cost for each, then deltas
  const computed: PeriodCost[] = periods.map((p) => {
    const { labor, ops } = costInRange(
      p.start,
      p.end,
      allocations,
      profilesById,
      expenses,
      salaryHistory,
      projectId
    );
    return {
      ...p,
      labor,
      ops,
      total: labor + ops,
      deltaTotal: 0,
      deltaPct: null,
    };
  });

  for (let i = 1; i < computed.length; i++) {
    const prev = computed[i - 1].total;
    const cur = computed[i].total;
    computed[i].deltaTotal = cur - prev;
    computed[i].deltaPct = prev > 0 ? ((cur - prev) / prev) * 100 : null;
  }

  return computed;
}

function isoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function formatDM(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// =====================================================
// Monthly cost timeline (for charts) — legacy alias of periodCostTimeline
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
  projectId?: string,
  salaryHistory: SalaryHistory[] = []
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
      labor += allocationCostForMonth(a, p, y, m, salaryHistory);
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

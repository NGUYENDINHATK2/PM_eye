import {
  paymentSummary,
  phaseRoleGaps,
  projectFinance,
  userLoadCurrentMonth,
  userLoadToday,
  userPeakLoad,
  type ProjectFinance,
} from "@/lib/calculations";
import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPayment,
  ProjectPhase,
  SalaryHistory,
} from "@/types/database";

export type AlertKind =
  | "burnout"
  | "idle"
  | "budget"
  | "missing-role"
  | "deadline"
  | "hygiene";

export type AppAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  href?: string;
  severity: "critical" | "warn" | "info";
};

const DAY_MS = 86_400_000;

export function buildAppAlerts(input: {
  profiles: Profile[];
  projects: Project[];
  phases: ProjectPhase[];
  allocations: Allocation[];
  expenses: OperatingExpense[];
  payments: ProjectPayment[];
  salaryHistory: SalaryHistory[];
  asOf?: Date;
}): { alerts: AppAlert[]; finances: { project: Project; finance: ProjectFinance }[] } {
  const today = input.asOf ?? new Date();
  const profilesById = new Map(input.profiles.map((p) => [p.id, p]));
  const alerts: AppAlert[] = [];

  const finances = input.projects.map((p) => ({
    project: p,
    finance: projectFinance(
      p,
      input.allocations,
      profilesById,
      input.expenses,
      today,
      input.salaryHistory
    ),
  }));

  for (const { project, finance } of finances) {
    if (finance.hasRevenue && finance.profit < 0) {
      alerts.push({
        id: `loss-${project.id}`,
        kind: "budget",
        severity: "critical",
        href: `/projects/${project.id}`,
        title: `${project.name} đang lỗ`,
        detail: `Margin ${Math.round(finance.margin * 100)}% · chi vượt DT ${Math.round(
          Math.abs(finance.profit) / 1_000_000
        )}tr.`,
      });
    }
    if (finance.hasCap && finance.overBudget) {
      alerts.push({
        id: `bud-${project.id}`,
        kind: "budget",
        severity: "critical",
        href: `/projects/${project.id}`,
        title: `${project.name} vượt budget`,
        detail: `Đã tiêu ${Math.round(finance.utilization * 100)}% ngân sách.`,
      });
    } else if (
      finance.hasCap &&
      finance.utilization > 0.85 &&
      project.status === "ongoing"
    ) {
      alerts.push({
        id: `budwarn-${project.id}`,
        kind: "budget",
        severity: "warn",
        href: `/projects/${project.id}`,
        title: `${project.name} sắp hết budget`,
        detail: `Còn ${Math.max(0, 100 - Math.round(finance.utilization * 100))}% ngân sách.`,
      });
    }

    if (project.end_date && project.status === "ongoing") {
      const end = new Date(project.end_date);
      const days = Math.ceil((end.getTime() - today.getTime()) / DAY_MS);
      if (days >= 0 && days <= 14) {
        alerts.push({
          id: `pend-${project.id}`,
          kind: "deadline",
          severity: days <= 7 ? "critical" : "warn",
          href: `/projects/${project.id}`,
          title: `${project.name} sắp kết thúc`,
          detail: days === 0 ? "Hết hạn hôm nay." : `Còn ${days} ngày (${project.end_date}).`,
        });
      } else if (days < 0) {
        alerts.push({
          id: `pover-${project.id}`,
          kind: "deadline",
          severity: "warn",
          href: `/projects/${project.id}`,
          title: `${project.name} đã quá hạn đóng`,
          detail: `End date ${project.end_date} nhưng vẫn ongoing.`,
        });
      }
    }
  }

  const ar = paymentSummary(input.payments, today);
  if (ar.overdueCount > 0) {
    alerts.push({
      id: "ar-overdue",
      kind: "budget",
      severity: "critical",
      href: "/insights",
      title: `${ar.overdueCount} đợt thu quá hạn`,
      detail: `Tổng ${Math.round(ar.totalOverdue / 1_000_000)}tr — cần chase khách.`,
    });
  }

  const peakEnd = new Date(today);
  peakEnd.setDate(peakEnd.getDate() + 30);

  for (const p of input.profiles) {
    if (!p.is_active) continue;
    const loadNow = userLoadToday(p.id, input.allocations, today);
    const loadMonth = userLoadCurrentMonth(p.id, input.allocations, today);
    if (loadNow > 1.0) {
      alerts.push({
        id: `burn-${p.id}`,
        kind: "burnout",
        severity: loadNow > 1.2 ? "critical" : "warn",
        href: "/allocations",
        title: `${p.full_name} đang ${Math.round(loadNow * 100)}% tải`,
        detail: "Quá tải hiện tại — cân nhắc rebalance.",
      });
    } else if (loadNow === 0 && loadMonth === 0) {
      alerts.push({
        id: `idle-${p.id}`,
        kind: "idle",
        severity: "info",
        href: "/employees",
        title: `${p.full_name} đang bench`,
        detail: "Không có allocation tháng này.",
      });
    }

    const peak = userPeakLoad(p.id, input.allocations, today, peakEnd);
    if (peak && peak.load > 1.2 && loadNow <= 1.0) {
      alerts.push({
        id: `peak-${p.id}`,
        kind: "burnout",
        severity: "warn",
        href: "/allocations",
        title: `${p.full_name} sắp peak ${Math.round(peak.load * 100)}%`,
        detail: `Trong 30 ngày tới (khoảng ${peak.date.toLocaleDateString("vi-VN")}).`,
      });
    }
  }

  for (const ph of input.phases) {
    const startD = new Date(ph.start_date);
    const endD = new Date(ph.end_date);
    const proj = input.projects.find((p) => p.id === ph.project_id);

    if (today >= startD && today <= endD) {
      const gaps = phaseRoleGaps(ph, input.allocations, profilesById);
      for (const g of gaps) {
        if (g.missing > 0) {
          alerts.push({
            id: `gap-${ph.id}-${g.role}`,
            kind: "missing-role",
            severity: "warn",
            href: proj ? `/projects/${proj.id}` : "/projects",
            title: `${proj?.name ?? "?"} · ${ph.phase_name} thiếu ${g.role}`,
            detail: `Cần ${g.required}, có ${g.assigned.toFixed(1)} FTE.`,
          });
        }
      }
    }

    const daysToEnd = Math.ceil((endD.getTime() - today.getTime()) / DAY_MS);
    if (daysToEnd >= 0 && daysToEnd <= 7 && today <= endD) {
      alerts.push({
        id: `phend-${ph.id}`,
        kind: "deadline",
        severity: "info",
        href: proj ? `/projects/${proj.id}` : "/projects",
        title: `Phase "${ph.phase_name}" sắp hết`,
        detail: `${proj?.name ?? "?"} · còn ${daysToEnd} ngày.`,
      });
    }
  }

  // Hygiene: allocation không gắn phase trong khi project có phases
  const phasesByProject = new Map<string, number>();
  for (const ph of input.phases) {
    phasesByProject.set(ph.project_id, (phasesByProject.get(ph.project_id) ?? 0) + 1);
  }
  const orphanCounts = new Map<string, number>();
  for (const a of input.allocations) {
    if (a.phase_id) continue;
    if ((phasesByProject.get(a.project_id) ?? 0) === 0) continue;
    const aEnd = new Date(a.end_date);
    if (aEnd < today) continue;
    orphanCounts.set(a.project_id, (orphanCounts.get(a.project_id) ?? 0) + 1);
  }
  for (const [projectId, count] of orphanCounts) {
    const proj = input.projects.find((p) => p.id === projectId);
    if (!proj) continue;
    alerts.push({
      id: `orphan-${projectId}`,
      kind: "hygiene",
      severity: "info",
      href: `/allocations`,
      title: `${proj.name}: ${count} phân bổ chưa gắn phase`,
      detail: "Gắn phase giúp theo dõi gap & chi phí giai đoạn chính xác hơn.",
    });
  }

  // Sort: critical → warn → info
  const rank = { critical: 0, warn: 1, info: 2 } as const;
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return { alerts, finances };
}

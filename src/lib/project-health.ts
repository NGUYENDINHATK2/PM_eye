/**
 * Sức khỏe dự án — 4 trục: Staffing · Tiền · Tiến độ · Người → Đỏ/Vàng/Xanh.
 */

import type { ProjectFinance } from "@/lib/calculations";
import { userLoadToday } from "@/lib/calculations";
import {
  projectForceFit,
  type ForceFitVerdict,
  type ProjectForceFit,
} from "@/lib/force-fit";
import { effectivePhaseStatus } from "@/lib/phase-status";
import type {
  Allocation,
  Profile,
  Project,
  ProjectPhase,
  ProjectRisk,
} from "@/types/database";

export type HealthTone = "green" | "yellow" | "red" | "gray";

export type AxisHealth = {
  key: "staffing" | "money" | "schedule" | "people" | "blocker";
  label: string;
  tone: HealthTone;
  detail: string;
};

export type ProjectHealthScore = {
  tone: HealthTone;
  label: string;
  axes: AxisHealth[];
  fit: ProjectForceFit;
  openBlockers: number;
};

function worse(a: HealthTone, b: HealthTone): HealthTone {
  const rank: Record<HealthTone, number> = {
    gray: 0,
    green: 1,
    yellow: 2,
    red: 3,
  };
  return rank[a] >= rank[b] ? a : b;
}

function toneLabel(t: HealthTone): string {
  switch (t) {
    case "green":
      return "Ổn";
    case "yellow":
      return "Cần chú ý";
    case "red":
      return "Rủi ro";
    default:
      return "—";
  }
}

function staffingTone(verdict: ForceFitVerdict): AxisHealth {
  switch (verdict) {
    case "strong":
    case "balanced":
      return {
        key: "staffing",
        label: "Staffing",
        tone: "green",
        detail: "Fit team ổn",
      };
    case "tight":
    case "unset":
      return {
        key: "staffing",
        label: "Staffing",
        tone: "yellow",
        detail: verdict === "unset" ? "Chưa set độ khó" : "Fit sát ngưỡng",
      };
    case "empty":
    case "underpowered":
    case "understaffed":
    case "overloaded":
      return {
        key: "staffing",
        label: "Staffing",
        tone: "red",
        detail:
          verdict === "overloaded"
            ? "Team quá tải"
            : verdict === "empty"
              ? "Chưa có người"
              : "Thiếu lực / thiếu người",
      };
    default:
      return { key: "staffing", label: "Staffing", tone: "gray", detail: "—" };
  }
}

function moneyTone(
  finance: ProjectFinance | null,
  canViewMoney: boolean
): AxisHealth {
  if (!canViewMoney || !finance) {
    return { key: "money", label: "Tiền", tone: "gray", detail: "Ẩn" };
  }
  if (finance.overBudget || (finance.hasRevenue && finance.profit < 0)) {
    return {
      key: "money",
      label: "Tiền",
      tone: "red",
      detail: finance.overBudget ? "Vượt budget" : "Đang lỗ",
    };
  }
  if (finance.hasCap && finance.utilization > 0.85) {
    return {
      key: "money",
      label: "Tiền",
      tone: "yellow",
      detail: "Sắp hết budget",
    };
  }
  return {
    key: "money",
    label: "Tiền",
    tone: "green",
    detail: "Trong ngân sách",
  };
}

function scheduleTone(phases: ProjectPhase[], project: Project): AxisHealth {
  const today = new Date();
  const relevant = phases.filter((ph) => ph.project_id === project.id);
  if (relevant.length === 0) {
    const end = project.end_date ? new Date(project.end_date) : null;
    if (end && project.status === "ongoing" && end < today) {
      return {
        key: "schedule",
        label: "Tiến độ",
        tone: "red",
        detail: "Dự án quá hạn",
      };
    }
    return {
      key: "schedule",
      label: "Tiến độ",
      tone: "yellow",
      detail: "Chưa có phase",
    };
  }

  let delayed = 0;
  let active = 0;
  for (const ph of relevant) {
    const st = effectivePhaseStatus(ph, today);
    if (st === "delayed") delayed += 1;
    if (st === "active") active += 1;
  }

  if (delayed > 0) {
    return {
      key: "schedule",
      label: "Tiến độ",
      tone: "red",
      detail: `${delayed} phase trễ`,
    };
  }
  return {
    key: "schedule",
    label: "Tiến độ",
    tone: "green",
    detail: active > 0 ? `${active} phase đang chạy` : "Đúng hạn",
  };
}

function peopleTone(
  project: Project,
  allocations: Allocation[],
  asOf: Date
): AxisHealth {
  const memberIds = new Set<string>();
  let overloaded = 0;
  for (const a of allocations) {
    if (a.project_id !== project.id) continue;
    const start = new Date(a.start_date);
    const end = new Date(a.end_date);
    if (asOf < start || asOf > end) continue;
    if (memberIds.has(a.user_id)) continue;
    memberIds.add(a.user_id);
    if (userLoadToday(a.user_id, allocations, asOf) > 1) overloaded += 1;
  }
  if (memberIds.size === 0) {
    return {
      key: "people",
      label: "Người",
      tone: "yellow",
      detail: "Chưa có alloc",
    };
  }
  const ratio = overloaded / memberIds.size;
  if (ratio >= 0.4 || overloaded >= 2) {
    return {
      key: "people",
      label: "Người",
      tone: "red",
      detail: `${overloaded}/${memberIds.size} quá tải`,
    };
  }
  if (overloaded > 0) {
    return {
      key: "people",
      label: "Người",
      tone: "yellow",
      detail: `${overloaded} người quá tải`,
    };
  }
  return { key: "people", label: "Người", tone: "green", detail: "Tải ổn" };
}

export function projectHealth(input: {
  project: Project;
  phases: ProjectPhase[];
  allocations: Allocation[];
  profilesById: Map<string, Profile>;
  finance: ProjectFinance | null;
  canViewMoney: boolean;
  risks?: ProjectRisk[];
  asOf?: Date;
}): ProjectHealthScore {
  const asOf = input.asOf ?? new Date();
  const projectPhases = input.phases.filter(
    (ph) => ph.project_id === input.project.id
  );
  const fit = projectForceFit(
    input.project,
    input.allocations,
    input.profilesById,
    input.allocations,
    asOf,
    projectPhases
  );

  const axes: AxisHealth[] = [
    staffingTone(fit.verdict),
    moneyTone(input.finance, input.canViewMoney),
    scheduleTone(projectPhases, input.project),
    peopleTone(input.project, input.allocations, asOf),
  ];

  const openBlockers = (input.risks ?? []).filter(
    (r) =>
      r.project_id === input.project.id &&
      r.status === "open" &&
      (r.kind === "blocker" || r.severity === "critical")
  ).length;

  if (openBlockers > 0) {
    axes.push({
      key: "blocker",
      label: "Blocker",
      tone: "red",
      detail: `${openBlockers} đang mở`,
    });
  }

  let tone: HealthTone = "green";
  for (const ax of axes) {
    if (ax.tone === "gray") continue;
    tone = worse(tone, ax.tone);
  }
  if (input.project.status === "paused") tone = worse(tone, "yellow");

  return {
    tone,
    label: toneLabel(tone),
    axes,
    fit,
    openBlockers,
  };
}

export function healthToneClass(tone: HealthTone): string {
  switch (tone) {
    case "green":
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300";
    case "yellow":
      return "bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:text-amber-300";
    case "red":
      return "bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-300";
    default:
      return "bg-muted text-muted-foreground ring-border/50";
  }
}

export function healthDotClass(tone: HealthTone): string {
  switch (tone) {
    case "green":
      return "bg-emerald-500";
    case "yellow":
      return "bg-amber-500";
    case "red":
      return "bg-rose-500";
    default:
      return "bg-muted-foreground/40";
  }
}

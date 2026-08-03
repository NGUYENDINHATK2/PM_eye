import { userLoadToday } from "@/lib/calculations";
import type { Allocation, Profile, Project, ProjectPhase } from "@/types/database";

/**
 * ============================================================
 * CÔNG THỨC LỰC CHIẾN DỰ ÁN (ổn định, cùng thang 1–100)
 * ============================================================
 *
 * Ký hiệu (chỉ tính allocation đang active hôm nay trên dự án):
 *   power_i ∈ [1,100]  — lực chiến cá nhân
 *   a_i     ∈ (0,1]    — % phân bổ trên dự án
 *   D       ∈ [1,100]  — độ khó = mức LC trung bình team CẦN có
 *                        (Junior≈50, Middle≈65, Senior≈80)
 *
 * 1) FTE     = Σ a_i
 * 2) P_eff   = Σ (power_i × a_i)          // tổng LC có trọng số
 * 3) P_avg   = P_eff / FTE                // LC trung bình (luôn ~1–100)
 * 4) Fit     = P_avg / D                  // khớp chất lượng (cùng thang)
 *
 * Nhân sự (từ required_roles các phase, nếu có):
 * 5) R_fte   = Σ count(required_roles)
 * 6) Staff   = FTE / R_fte                // đủ người chưa
 *
 * Quá tải (trục riêng, ưu tiên cao):
 * 7) overloaded nếu ≥ 40% người trên dự án có load toàn cục > 100%
 *
 * Verdict (theo thứ tự ưu tiên):
 *   empty → overloaded → unset → understaffed → underpowered → tight → balanced → strong
 *
 * Ngưỡng Fit (chất lượng):
 *   < 0.80  underpowered | 0.80–0.95 tight | 0.95–1.20 balanced | > 1.20 strong
 * Ngưỡng Staff (số lượng):
 *   < 0.75  understaffed (thiếu người, kể cả khi LC TB ổn)
 * ============================================================
 */

/** Ngưỡng cố định — không đổi lung tung theo UI */
export const FORCE_FIT_THRESHOLDS = {
  qualityUnder: 0.8,
  qualityTight: 0.95,
  qualityStrong: 1.2,
  staffUnder: 0.75,
  /** Tỷ lệ người over-load để gọi là team quá tải */
  overloadMemberRatio: 0.4,
  /** Load toàn cục coi là quá tải */
  overloadLoad: 1.0,
} as const;

export type ForceFitVerdict =
  | "unset"
  | "empty"
  | "underpowered"
  | "understaffed"
  | "tight"
  | "balanced"
  | "strong"
  | "overloaded";

export type RoleForce = {
  role: string;
  fte: number;
  /** P_eff của role */
  power: number;
  /** P_avg của role */
  avgPower: number;
};

export type ProjectForceFit = {
  /** P_eff = Σ (power × a) */
  teamPower: number;
  /** Σ a */
  fte: number;
  /** P_avg = P_eff / FTE */
  avgPower: number;
  /** D — độ khó (mức LC TB yêu cầu) */
  difficulty: number;
  /**
   * Fit chất lượng = P_avg / D (null nếu chưa đặt D).
   * Đây mới là chỉ số chính — cùng thang 1–100.
   */
  qualityFit: number | null;
  /** @deprecated dùng qualityFit — giữ alias cho UI cũ */
  coverage: number | null;
  /** FTE yêu cầu từ phase required_roles (0 = không có dữ liệu) */
  requiredFte: number;
  /** Staff = FTE / requiredFte (null nếu không có required) */
  staffFit: number | null;
  overloadedCount: number;
  headcount: number;
  byRole: RoleForce[];
  verdict: ForceFitVerdict;
  label: string;
  hint: string;
};

/**
 * Gợi ý độ khó = mức LC TB cần có.
 * Heuristic ổn định theo role yêu cầu (không nhân số slot — tránh vượt thang 100).
 */
export function suggestDifficultyFromPhases(phases: ProjectPhase[]): number {
  const weights: Record<string, number> = {
    Architect: 90,
    "Tech Lead": 85,
    "BU Lead": 80,
    "FE Dev": 55,
    "BE Dev": 55,
    Fullstack: 60,
    Mobile: 55,
    DevOps: 65,
    BA: 55,
    Comtor: 45,
    Designer: 50,
    "UI/UX": 50,
    QA: 50,
    QC: 50,
    Tester: 45,
    PM: 55,
    PO: 55,
  };

  let weighted = 0;
  let slots = 0;
  for (const ph of phases) {
    const req = Array.isArray(ph.required_roles) ? ph.required_roles : [];
    for (const r of req) {
      const c = Number(r.count) || 0;
      if (c <= 0) continue;
      const w = weights[r.role] ?? 50;
      weighted += w * c;
      slots += c;
    }
  }
  if (slots <= 0) return 55; // default Middle- Junior
  return Math.min(100, Math.max(1, Math.round(weighted / slots)));
}

/** FTE yêu cầu từ required_roles (lấy max theo phase đang/ sắp, hoặc tổng unique — dùng tổng count phase ongoing-ish). */
export function requiredFteFromPhases(
  phases: ProjectPhase[],
  asOf: Date = new Date()
): number {
  let total = 0;
  for (const ph of phases) {
    const start = new Date(ph.start_date);
    const end = new Date(ph.end_date);
    // Phase đang chạy hoặc bắt đầu trong 14 ngày
    const soon = new Date(asOf);
    soon.setDate(soon.getDate() + 14);
    if (end < asOf || start > soon) continue;
    const req = Array.isArray(ph.required_roles) ? ph.required_roles : [];
    for (const r of req) total += Number(r.count) || 0;
  }
  return Math.round(total * 100) / 100;
}

export function projectForceFit(
  project: Project,
  allocations: Allocation[],
  profilesById: Map<string, Profile>,
  allAllocationsForLoad?: Allocation[],
  asOf: Date = new Date(),
  phases: ProjectPhase[] = []
): ProjectForceFit {
  const T = FORCE_FIT_THRESHOLDS;
  const difficulty = Math.max(0, Math.min(100, Number(project.difficulty) || 0));
  const loadSource = allAllocationsForLoad ?? allocations;

  let teamPower = 0;
  let fte = 0;
  const byRoleMap = new Map<string, { fte: number; power: number }>();
  const memberIds = new Set<string>();

  for (const a of allocations) {
    if (a.project_id !== project.id) continue;
    const start = new Date(a.start_date);
    const end = new Date(a.end_date);
    if (asOf < start || asOf > end) continue;

    const profile = profilesById.get(a.user_id);
    if (!profile) continue;

    const pct = Math.max(0, Number(a.percent) || 0);
    if (pct <= 0) continue;

    const power = Math.min(100, Math.max(1, Number(profile.power_score) || 50));
    const contrib = power * pct;

    teamPower += contrib;
    fte += pct;
    memberIds.add(profile.id);

    const role = profile.job_role || "Other";
    const prev = byRoleMap.get(role) ?? { fte: 0, power: 0 };
    prev.fte += pct;
    prev.power += contrib;
    byRoleMap.set(role, prev);
  }

  // Làm tròn ổn định (1 chữ số FTE, LC nguyên)
  fte = Math.round(fte * 10) / 10;
  teamPower = Math.round(teamPower);
  const avgPower = fte > 0 ? Math.round(teamPower / fte) : 0;

  const byRole: RoleForce[] = Array.from(byRoleMap.entries())
    .map(([role, v]) => ({
      role,
      fte: Math.round(v.fte * 10) / 10,
      power: Math.round(v.power),
      avgPower: v.fte > 0 ? Math.round(v.power / v.fte) : 0,
    }))
    .sort((a, b) => b.power - a.power);

  let overloadedCount = 0;
  for (const uid of memberIds) {
    if (userLoadToday(uid, loadSource, asOf) > T.overloadLoad) {
      overloadedCount++;
    }
  }

  const headcount = memberIds.size;
  const requiredFte = requiredFteFromPhases(
    phases.filter((ph) => ph.project_id === project.id),
    asOf
  );
  const staffFit =
    requiredFte > 0 && fte > 0
      ? Math.round((fte / requiredFte) * 100) / 100
      : requiredFte > 0 && fte === 0
        ? 0
        : null;

  // CHỈ SỐ CHÍNH: P_avg / D (cùng thang)
  const qualityFit =
    difficulty > 0 && avgPower > 0
      ? Math.round((avgPower / difficulty) * 100) / 100
      : null;

  let verdict: ForceFitVerdict;
  let label: string;
  let hint: string;

  const overloadHit =
    headcount > 0 &&
    overloadedCount / headcount >= T.overloadMemberRatio;

  if (headcount === 0 || fte <= 0) {
    verdict = "empty";
    label = "Chưa có team";
    hint = "Phân bổ Dev / BA / Comtor… vào dự án để tính lực chiến.";
  } else if (overloadHit) {
    verdict = "overloaded";
    label = "Team quá tải";
    hint = `${overloadedCount}/${headcount} người load >100% toàn cục — ưu tiên giảm tải trước khi bàn độ khó.`;
  } else if (difficulty <= 0) {
    verdict = "unset";
    label = "Chưa đặt độ khó";
    hint = `LC trung bình team = ${avgPower} (thang 1–100). Đặt độ khó cùng thang để so khớp.`;
  } else if (staffFit !== null && staffFit < T.staffUnder) {
    verdict = "understaffed";
    label = "Thiếu người";
    hint = `Có ${fte} FTE / cần ~${requiredFte} — thiếu slot dù LC TB ${avgPower}${
      qualityFit != null ? ` (${Math.round(qualityFit * 100)}% độ khó)` : ""
    }.`;
  } else if (qualityFit !== null && qualityFit < T.qualityUnder) {
    verdict = "underpowered";
    label = "Thiếu lực chiến";
    hint = `LC TB ${avgPower} / cần ${difficulty} (= ${Math.round(
      qualityFit * 100
    )}%) — cần level cao hơn hoặc thêm người mạnh.`;
  } else if (qualityFit !== null && qualityFit < T.qualityTight) {
    verdict = "tight";
    label = "Sát mức";
    hint = `LC TB ${avgPower} / cần ${difficulty} (= ${Math.round(
      qualityFit * 100
    )}%) — ổn nếu scope không phình.`;
  } else if (qualityFit !== null && qualityFit <= T.qualityStrong) {
    verdict = "balanced";
    label = "Vừa sức";
    hint = `LC TB ${avgPower} khớp độ khó ${difficulty} (${Math.round(
      (qualityFit ?? 0) * 100
    )}%).`;
  } else {
    verdict = "strong";
    label = "Dư lực";
    hint = `LC TB ${avgPower} > độ khó ${difficulty} (${Math.round(
      (qualityFit ?? 0) * 100
    )}%) — có thể gánh scope khó hơn hoặc bớt người mạnh.`;
  }

  return {
    teamPower,
    fte,
    avgPower,
    difficulty,
    qualityFit,
    coverage: qualityFit,
    requiredFte,
    staffFit,
    overloadedCount,
    headcount,
    byRole,
    verdict,
    label,
    hint,
  };
}

export function forceFitTone(verdict: ForceFitVerdict): {
  text: string;
  bg: string;
  bar: string;
  badge: "destructive" | "warning" | "success" | "info" | "secondary";
} {
  switch (verdict) {
    case "underpowered":
    case "understaffed":
      return {
        text: "text-rose-700 dark:text-rose-300",
        bg: "bg-rose-500/[0.07] ring-rose-500/20",
        bar: "#f43f5e",
        badge: "destructive",
      };
    case "tight":
    case "overloaded":
      return {
        text: "text-amber-700 dark:text-amber-300",
        bg: "bg-amber-500/[0.07] ring-amber-500/20",
        bar: "#f59e0b",
        badge: "warning",
      };
    case "balanced":
      return {
        text: "text-emerald-700 dark:text-emerald-300",
        bg: "bg-emerald-500/[0.07] ring-emerald-500/20",
        bar: "#10b981",
        badge: "success",
      };
    case "strong":
      return {
        text: "text-sky-700 dark:text-sky-300",
        bg: "bg-sky-500/[0.07] ring-sky-500/20",
        bar: "#0ea5e9",
        badge: "info",
      };
    default:
      return {
        text: "text-muted-foreground",
        bg: "bg-muted/40 ring-border/50",
        bar: "#94a3b8",
        badge: "secondary",
      };
  }
}

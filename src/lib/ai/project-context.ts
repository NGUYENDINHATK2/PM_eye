import { userLoadToday } from "@/lib/calculations";
import { projectForceFit } from "@/lib/force-fit";
import type {
  Allocation,
  Profile,
  Project,
  ProjectPhase,
} from "@/types/database";

/** Context gửi AI — KHÔNG gồm lương / tiền nhạy cảm. */
export function buildProjectAdviceContext(input: {
  project: Project;
  phases: ProjectPhase[];
  allocations: Allocation[];
  allAllocations: Allocation[];
  profiles: Profile[];
}) {
  const { project, phases, allocations, allAllocations, profiles } = input;
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const today = new Date();

  const fit = projectForceFit(
    project,
    allocations,
    profilesById,
    allAllocations,
    today,
    phases
  );

  const onProject = allocations
    .filter((a) => {
      if (a.project_id !== project.id) return false;
      const s = new Date(a.start_date);
      const e = new Date(a.end_date);
      return today >= s && today <= e;
    })
    .map((a) => {
      const p = profilesById.get(a.user_id);
      return {
        name: p?.full_name ?? "?",
        job_role: p?.job_role ?? "?",
        level: p?.level ?? "Junior",
        power_score: Number(p?.power_score) || 50,
        alloc_percent: Number(a.percent) || 0,
        global_load_today: p
          ? Math.round(userLoadToday(p.id, allAllocations, today) * 100) / 100
          : null,
      };
    });

  const onProjectIds = new Set<string>();
  for (const a of allocations) {
    if (a.project_id !== project.id) continue;
    const s = new Date(a.start_date);
    const e = new Date(a.end_date);
    if (today >= s && today <= e) onProjectIds.add(a.user_id);
  }

  const candidates = profiles
    .filter((p) => p.is_active)
    .map((p) => {
      const load = userLoadToday(p.id, allAllocations, today);
      return {
        name: p.full_name,
        job_role: p.job_role,
        level: p.level,
        power_score: Number(p.power_score) || 50,
        global_load_today: Math.round(load * 100) / 100,
        on_this_project: onProjectIds.has(p.id),
      };
    })
    .filter((c) => !c.on_this_project && c.global_load_today < 0.85)
    .sort(
      (a, b) =>
        b.power_score - a.power_score ||
        a.global_load_today - b.global_load_today
    )
    .slice(0, 28);

  const phaseBrief = phases
    .filter((ph) => ph.project_id === project.id)
    .map((ph) => ({
      name: ph.phase_name,
      start: ph.start_date,
      end: ph.end_date,
      required_roles: ph.required_roles,
    }));

  return {
    project: {
      name: project.name,
      client: project.client,
      status: project.status,
      difficulty: Number(project.difficulty) || 0,
      description: project.description,
    },
    force_fit: {
      verdict: fit.verdict,
      label: fit.label,
      hint: fit.hint,
      avg_power: fit.avgPower,
      fte: fit.fte,
      quality_fit: fit.qualityFit,
      staff_fit: fit.staffFit,
      required_fte: fit.requiredFte,
      by_role: fit.byRole,
      overloaded_count: fit.overloadedCount,
    },
    team_today: onProject,
    available_candidates: candidates,
    phases: phaseBrief,
    formula_note:
      "Fit = P_avg / difficulty; P_avg = Σ(power×alloc%)/Σ(alloc%). Thang LC 1–100.",
  };
}

export const PROJECT_ADVICE_SYSTEM = `Bạn là PM advisor nội bộ PM_Eye (tiếng Việt, sắc, thực dụng).

Phân tích lực chiến / staffing dự án. KHÔNG đề cập lương, ngân sách, doanh thu, P&L.

Công thức: Fit = LC trung bình team ÷ độ khó (thang 1–100).
Ưu tiên: quá tải → thiếu người → thiếu lực → dư lực.

Trả về ĐÚNG 1 JSON object (không markdown):
{
  "headline": "tiêu đề ngắn ≤12 từ",
  "score": 0-100,
  "mood": "critical|warn|ok|strong|neutral",
  "summary": "2 câu tóm tắt",
  "insights": ["nhận định 1", "nhận định 2"],
  "tags": ["tag ngắn", "..."],
  "actions": [
    {
      "priority": "high|med|low",
      "title": "hành động ngắn",
      "detail": "vì sao / cách làm",
      "person": "Tên ứng viên hoặc null",
      "role": "FE Dev hoặc null"
    }
  ]
}

score: 85+ strong, 65-84 ok, 40-64 warn, <40 critical.
actions: tối đa 5, ưu tiên làm được ngay; person chỉ lấy từ available_candidates.`;

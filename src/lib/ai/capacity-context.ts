import {
  loadStatus,
  userLoadCurrentMonth,
  userLoadToday,
} from "@/lib/calculations";
import type { Allocation, Profile, Project } from "@/types/database";

export function buildCapacityBriefContext(input: {
  profiles: Profile[];
  allocations: Allocation[];
  projects: Project[];
}) {
  const today = new Date();
  const active = input.profiles.filter((p) => p.is_active);

  const people = active.map((p) => {
    const load = userLoadToday(p.id, input.allocations, today);
    const month = userLoadCurrentMonth(p.id, input.allocations, today);
    return {
      name: p.full_name,
      job_role: p.job_role,
      level: p.level,
      power_score: Number(p.power_score) || 50,
      load_today: Math.round(load * 100) / 100,
      load_month: Math.round(month * 100) / 100,
      status: loadStatus(load),
    };
  });

  const overloaded = people.filter((p) => p.load_today > 1);
  const bench = people.filter((p) => p.load_today === 0);
  const healthy = people.filter(
    (p) => p.load_today > 0 && p.load_today <= 1
  );

  const avgLoad =
    people.length > 0
      ? Math.round(
          (people.reduce((s, p) => s + p.load_today, 0) / people.length) * 100
        ) / 100
      : 0;

  const byRole = new Map<string, { count: number; avgLoad: number; sum: number }>();
  for (const p of people) {
    const cur = byRole.get(p.job_role) ?? { count: 0, avgLoad: 0, sum: 0 };
    cur.count++;
    cur.sum += p.load_today;
    byRole.set(p.job_role, cur);
  }
  const roles = Array.from(byRole.entries()).map(([role, v]) => ({
    role,
    count: v.count,
    avg_load: Math.round((v.sum / v.count) * 100) / 100,
  }));

  const ongoing = input.projects.filter((p) => p.status === "ongoing").length;

  return {
    as_of: today.toISOString().slice(0, 10),
    totals: {
      active_people: people.length,
      ongoing_projects: ongoing,
      overloaded: overloaded.length,
      bench: bench.length,
      healthy: healthy.length,
      avg_load: avgLoad,
    },
    top_overloaded: overloaded
      .sort((a, b) => b.load_today - a.load_today)
      .slice(0, 8),
    bench_sample: bench.slice(0, 10),
    roles,
    strong_bench: bench
      .filter((p) => p.power_score >= 65)
      .sort((a, b) => b.power_score - a.power_score)
      .slice(0, 8),
  };
}

export const CAPACITY_BRIEF_SYSTEM = `Bạn là Capacity coach nội bộ PM_Eye (tiếng Việt, ngắn, actionable).

Phân tích tải team hôm nay. KHÔNG đề cập lương / tiền.

Trả về ĐÚNG 1 JSON object:
{
  "headline": "≤12 từ",
  "score": 0-100,
  "mood": "critical|warn|ok|strong|neutral",
  "summary": "2 câu",
  "insights": ["..."],
  "tags": ["..."],
  "actions": [
    {
      "priority": "high|med|low",
      "title": "...",
      "detail": "...",
      "person": "tên hoặc null",
      "role": "role hoặc null"
    }
  ]
}

score cao = capacity healthy (ít over, bench vừa phải).
Gợi ý: ai over cần giảm, ai bench mạnh có thể đẩy vào dự án.`;

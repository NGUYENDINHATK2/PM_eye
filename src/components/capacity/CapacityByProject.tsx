"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { userProjectBreakdownForMonth } from "@/lib/calculations";
import { cn, monthLabel } from "@/lib/utils";
import type { Allocation, Profile, Project } from "@/types/database";
import { useMemo } from "react";

/**
 * View "Project usage": mỗi dự án 1 card riêng,
 * liệt kê người đang đóng góp + % FTE từng người, có thanh stacked
 * cho thấy tỷ trọng. Tốt cho góc nhìn "dự án nào ngốn người nhất".
 */
export function CapacityByProject({
  profiles,
  allocations,
  projects,
  startDate,
}: {
  profiles: Profile[];
  allocations: Allocation[];
  projects: Project[];
  startDate: Date;
}) {
  const today = new Date();
  // Mặc định tính cho tháng "hiện tại" (clamp về startDate nếu sau today)
  const refDate = today > startDate ? today : startDate;
  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1;

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  // Gom theo project: { project, contributors: [{profile, percent}], totalFTE }
  const usage = useMemo(() => {
    const map = new Map<
      string,
      { project: Project; contributors: { profile: Profile; percent: number }[]; totalFTE: number }
    >();
    for (const p of profiles) {
      const breakdown = userProjectBreakdownForMonth(
        p.id,
        allocations,
        p,
        projectsById,
        year,
        month
      );
      for (const b of breakdown) {
        const proj = projectsById.get(b.projectId);
        if (!proj) continue;
        const slot = map.get(b.projectId) ?? {
          project: proj,
          contributors: [],
          totalFTE: 0,
        };
        slot.contributors.push({ profile: p, percent: b.percent });
        slot.totalFTE += b.percent;
        map.set(b.projectId, slot);
      }
    }
    return Array.from(map.values())
      .map((u) => ({
        ...u,
        contributors: u.contributors.sort((a, b) => b.percent - a.percent),
      }))
      .sort((a, b) => b.totalFTE - a.totalFTE);
  }, [profiles, allocations, projectsById, year, month]);

  if (usage.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <div className="text-sm font-medium">Chưa có allocation tháng này</div>
        <div className="text-xs text-muted-foreground mt-1">
          Phân bổ người vào dự án để xem chi tiết theo project.
        </div>
      </div>
    );
  }

  const maxFTE = Math.max(...usage.map((u) => u.totalFTE), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold text-base">Dự án ngốn người nhiều nhất</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Sắp xếp theo FTE đang dùng · {monthLabel(`${year}-${String(month).padStart(2, "0")}`)}
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {usage.length} dự án · {usage.reduce((s, u) => s + u.totalFTE, 0).toFixed(1)} FTE tổng
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {usage.map((u, idx) => {
          const widthPct = (u.totalFTE / maxFTE) * 100;
          return (
            <div
              key={u.project.id}
              className="rounded-2xl border bg-card p-4 relative overflow-hidden animate-fade-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div
                aria-hidden
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-40"
                style={{ background: u.project.color }}
              />

              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        background: u.project.color,
                        boxShadow: `0 0 0 3px ${u.project.color}33`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {u.project.name}
                      </div>
                      {u.project.client && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {u.project.client}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="text-xl font-semibold tnum tracking-tight"
                      style={{ color: u.project.color }}
                    >
                      {u.totalFTE.toFixed(1)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      FTE
                    </div>
                  </div>
                </div>

                {/* Stacked contributor bar */}
                <div className="h-2 rounded-full bg-muted overflow-hidden flex mb-1">
                  {u.contributors.map((c) => (
                    <div
                      key={c.profile.id}
                      style={{
                        width: `${(c.percent / Math.max(u.totalFTE, 1)) * widthPct}%`,
                        background: `linear-gradient(90deg, ${u.project.color}, ${u.project.color}cc)`,
                        opacity: 0.6 + (c.percent / u.totalFTE) * 0.4,
                      }}
                      className="border-r border-card last:border-r-0"
                    />
                  ))}
                </div>

                {/* Contributors list */}
                <div className="mt-3 space-y-1.5">
                  {u.contributors.slice(0, 6).map(({ profile, percent }) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {profile.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs truncate">
                          {profile.full_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {profile.role}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs tnum font-medium shrink-0",
                          percent > 0.8 && "text-rose-500"
                        )}
                      >
                        {Math.round(percent * 100)}%
                      </span>
                    </div>
                  ))}
                  {u.contributors.length > 6 && (
                    <div className="text-[10px] text-muted-foreground pl-8 pt-0.5">
                      + {u.contributors.length - 6} người khác…
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

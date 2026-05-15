"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  allocationCostForMonth,
  loadStatus,
  loadStatusLabel,
  userLoadForMonth,
} from "@/lib/calculations";
import { cn, formatCurrency, formatPercent, monthLabel } from "@/lib/utils";
import type {
  Allocation,
  Profile,
  Project,
} from "@/types/database";
import { useMemo } from "react";

export function BigHeatmap({
  profiles,
  allocations,
  projects,
  startDate,
  endDate,
}: {
  profiles: Profile[];
  allocations: Allocation[];
  projects: Project[];
  startDate: Date;
  endDate: Date;
}) {
  const today = new Date();

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const months = useMemo(() => {
    const arr: {
      year: number;
      month: number;
      key: string;
      isCurrent: boolean;
    }[] = [];
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
      arr.push({
        year: cur.getFullYear(),
        month: cur.getMonth() + 1,
        key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
        isCurrent:
          cur.getFullYear() === today.getFullYear() &&
          cur.getMonth() === today.getMonth(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return arr;
  }, [startDate, endDate, today]);

  function cellStyle(load: number): React.CSSProperties {
    if (load === 0) {
      return {
        background: "hsl(var(--muted))",
        color: "hsl(var(--muted-foreground))",
        border: "1px solid hsl(var(--border))",
      };
    }
    if (load > 1.2) {
      return {
        background:
          "linear-gradient(135deg, hsl(351 95% 58%), hsl(330 81% 52%))",
        color: "white",
        boxShadow: "0 6px 24px -6px hsl(351 95% 58% / 0.6)",
      };
    }
    if (load > 1.0) {
      return {
        background:
          "linear-gradient(135deg, hsl(38 92% 55%), hsl(27 87% 55%))",
        color: "white",
        boxShadow: "0 4px 18px -4px hsl(38 92% 55% / 0.45)",
      };
    }
    if (load >= 0.5) {
      const intensity = Math.min(1, load);
      return {
        background: `linear-gradient(135deg, hsl(158 64% ${58 - intensity * 14}%), hsl(173 58% ${48 - intensity * 12}%))`,
        color: "white",
        boxShadow: `0 4px 16px -4px hsl(158 64% 50% / ${0.2 + intensity * 0.25})`,
      };
    }
    return {
      background: "hsl(199 89% 50% / 0.15)",
      color: "hsl(199 89% 45%)",
      border: "1px solid hsl(199 89% 50% / 0.25)",
    };
  }

  return (
    <TooltipProvider delayDuration={50}>
      <div className="rounded-2xl border bg-card overflow-x-auto">
        <div className="min-w-[900px]">
          <table className="w-full border-separate border-spacing-y-2 border-spacing-x-2 p-3">
            <thead>
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider font-medium text-muted-foreground pb-3 pl-2 sticky left-0 bg-card z-10 min-w-[220px]">
                  Nhân sự ({profiles.length})
                </th>
                {months.map((m) => (
                  <th
                    key={m.key}
                    className={cn(
                      "text-center pb-3 min-w-[80px]",
                      m.isCurrent && "text-indigo-500"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-semibold",
                        m.isCurrent
                          ? "text-indigo-500"
                          : "text-muted-foreground"
                      )}
                    >
                      {monthLabel(m.key)}
                    </div>
                    {m.isCurrent && (
                      <div className="text-[9px] mt-0.5 text-indigo-500 font-medium uppercase tracking-wider">
                        Hiện tại
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, rowIdx) => (
                <tr
                  key={p.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${rowIdx * 30}ms` }}
                >
                  <td className="pl-2 sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {p.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {p.full_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {p.role}
                          {Number(p.base_salary) > 0 && (
                            <span className="ml-1.5 opacity-70">
                              · {formatCurrency(p.base_salary)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  {months.map((m) => {
                    const load = userLoadForMonth(
                      p.id,
                      allocations,
                      m.year,
                      m.month
                    );
                    const status = loadStatus(load);
                    const isCritical = load > 1.2;

                    // Project breakdown for this cell
                    const breakdown = projectBreakdown(
                      p.id,
                      allocations,
                      projectsById,
                      m.year,
                      m.month
                    );

                    const cost = breakdown.reduce(
                      (s, b) => s + b.cost,
                      0
                    );

                    return (
                      <td
                        key={m.key}
                        className="p-0 text-center align-middle"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "h-12 rounded-lg flex flex-col items-center justify-center text-sm font-semibold tnum cursor-pointer transition-all duration-200 hover:scale-105 relative overflow-hidden",
                                isCritical && "animate-glow-pulse",
                                m.isCurrent && "ring-2 ring-indigo-500/40"
                              )}
                              style={cellStyle(load)}
                            >
                              {load > 0 ? Math.round(load * 100) + "%" : "·"}
                              {/* Project color stripes at bottom */}
                              {breakdown.length > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                                  {breakdown.map((b) => (
                                    <div
                                      key={b.projectId}
                                      style={{
                                        background: b.color,
                                        width: `${(b.percent / Math.max(1, load)) * 100}%`,
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[260px]">
                            <div className="font-semibold flex items-center gap-2">
                              {p.full_name}{" "}
                              <Badge
                                variant={
                                  status === "critical" || status === "overloaded"
                                    ? "destructive"
                                    : status === "idle"
                                    ? "secondary"
                                    : status === "underused"
                                    ? "info"
                                    : "success"
                                }
                              >
                                {formatPercent(load)}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground mb-1.5">
                              {monthLabel(m.key)} · {loadStatusLabel(status)}
                            </div>
                            {breakdown.length > 0 ? (
                              <div className="space-y-1 mt-1.5 pt-1.5 border-t border-border">
                                {breakdown.map((b) => (
                                  <div
                                    key={b.projectId}
                                    className="flex items-center justify-between gap-3 text-[11px]"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ background: b.color }}
                                      />
                                      <span className="truncate">{b.name}</span>
                                    </div>
                                    <span className="tnum font-medium">
                                      {formatPercent(b.percent)}
                                    </span>
                                  </div>
                                ))}
                                {cost > 0 && (
                                  <div className="flex justify-between text-[10px] text-muted-foreground pt-1 mt-1 border-t border-border">
                                    <span>Chi phí lương</span>
                                    <span className="tnum">
                                      {formatCurrency(cost)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-muted-foreground italic mt-1">
                                Không có allocation
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );

  function projectBreakdown(
    userId: string,
    allocations: Allocation[],
    projectsById: Map<string, Project>,
    year: number,
    month: number
  ): { projectId: string; name: string; color: string; percent: number; cost: number }[] {
    const profile = profilesById.get(userId);
    if (!profile) return [];
    const map = new Map<
      string,
      { name: string; color: string; percent: number; cost: number }
    >();
    for (const a of allocations) {
      if (a.user_id !== userId) continue;
      const dim = new Date(year, month, 0).getDate();
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month - 1, dim);
      const aStart = new Date(a.start_date);
      const aEnd = new Date(a.end_date);
      const start = aStart > monthStart ? aStart : monthStart;
      const end = aEnd < monthEnd ? aEnd : monthEnd;
      if (end < start) continue;
      const overlap =
        Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      if (overlap <= 0) continue;
      const pct = Number(a.percent) * (overlap / dim);
      const cost = allocationCostForMonth(a, profile, year, month);
      const proj = projectsById.get(a.project_id);
      const key = a.project_id;
      const existing = map.get(key);
      if (existing) {
        existing.percent += pct;
        existing.cost += cost;
      } else {
        map.set(key, {
          name: proj?.name ?? "?",
          color: proj?.color ?? "#888",
          percent: pct,
          cost,
        });
      }
    }
    return Array.from(map.entries())
      .map(([projectId, v]) => ({ projectId, ...v }))
      .sort((a, b) => b.percent - a.percent);
  }
}

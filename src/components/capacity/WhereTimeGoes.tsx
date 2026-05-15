"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userLoadForMonth, loadStatus, loadStatusLabel } from "@/lib/calculations";
import { cn, formatPercent, monthLabel } from "@/lib/utils";
import type { Allocation, Profile, Project } from "@/types/database";
import { useMemo } from "react";

export function WhereTimeGoes({
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

  const months = useMemo(() => {
    const arr: { year: number; month: number; key: string; isCurrent: boolean }[] = [];
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

  return (
    <TooltipProvider delayDuration={50}>
      <div className="rounded-2xl border bg-card overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className="flex border-b">
            <div className="w-[220px] shrink-0 px-4 py-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground sticky left-0 bg-card z-10">
              Nhân sự ({profiles.length})
            </div>
            <div className="flex flex-1">
              {months.map((m) => (
                <div
                  key={m.key}
                  className={cn(
                    "flex-1 px-2 py-3 text-xs text-center min-w-[100px]",
                    m.isCurrent
                      ? "text-indigo-500 font-semibold bg-indigo-500/[0.04]"
                      : "text-muted-foreground"
                  )}
                >
                  {monthLabel(m.key)}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {profiles.map((p, rowIdx) => (
              <div
                key={p.id}
                className="flex items-stretch hover:bg-muted/20 transition animate-fade-up"
                style={{ animationDelay: `${rowIdx * 30}ms` }}
              >
                <div className="w-[220px] shrink-0 px-4 py-3 flex items-center gap-3 sticky left-0 bg-card z-10 border-r">
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
                    </div>
                  </div>
                </div>
                <div className="flex flex-1">
                  {months.map((m) => {
                    const breakdown = projectBreakdown(
                      p.id,
                      allocations,
                      projectsById,
                      m.year,
                      m.month
                    );
                    const load = userLoadForMonth(
                      p.id,
                      allocations,
                      m.year,
                      m.month
                    );
                    const status = loadStatus(load);
                    return (
                      <div
                        key={m.key}
                        className={cn(
                          "flex-1 px-2 py-3 min-w-[100px] flex items-center",
                          m.isCurrent && "bg-indigo-500/[0.03]"
                        )}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full cursor-pointer">
                              {breakdown.length === 0 ? (
                                <div className="h-6 rounded bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">
                                  bench
                                </div>
                              ) : (
                                <>
                                  <div className="h-6 rounded-md overflow-hidden flex shadow-sm">
                                    {breakdown.map((b) => (
                                      <div
                                        key={b.projectId}
                                        className="hover:brightness-110 transition relative group"
                                        style={{
                                          width: `${(b.percent / Math.max(1, load)) * 100}%`,
                                          background: `linear-gradient(135deg, ${b.color}, ${b.color}dd)`,
                                        }}
                                      />
                                    ))}
                                    {load < 1 && (
                                      <div
                                        className="bg-muted/50"
                                        style={{
                                          width: `${(1 - load) * 100}%`,
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="text-[10px] tnum text-center mt-1 text-muted-foreground">
                                    {Math.round(load * 100)}%
                                  </div>
                                </>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[240px]">
                            <div className="font-medium text-xs">
                              {monthLabel(m.key)} · {formatPercent(load)}
                            </div>
                            <div className="text-[10px] text-muted-foreground mb-1.5">
                              {loadStatusLabel(status)}
                            </div>
                            {breakdown.length === 0 ? (
                              <div className="text-[11px] italic text-muted-foreground">
                                Đang bench
                              </div>
                            ) : (
                              <div className="space-y-1 pt-1 border-t border-border">
                                {breakdown.map((b) => (
                                  <div
                                    key={b.projectId}
                                    className="flex items-center justify-between gap-3 text-[11px]"
                                  >
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ background: b.color }}
                                      />
                                      <span className="truncate">{b.name}</span>
                                    </span>
                                    <span className="tnum font-medium">
                                      {formatPercent(b.percent)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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
  ): { projectId: string; name: string; color: string; percent: number }[] {
    const map = new Map<string, { name: string; color: string; percent: number }>();
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
      const proj = projectsById.get(a.project_id);
      const key = a.project_id;
      const existing = map.get(key);
      if (existing) {
        existing.percent += pct;
      } else {
        map.set(key, {
          name: proj?.name ?? "?",
          color: proj?.color ?? "#888",
          percent: pct,
        });
      }
    }
    return Array.from(map.entries())
      .map(([projectId, v]) => ({ projectId, ...v }))
      .sort((a, b) => b.percent - a.percent);
  }
}

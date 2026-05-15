"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userLoadToday } from "@/lib/calculations";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import type {
  Allocation,
  Profile,
  Project,
  ProjectPhase,
} from "@/types/database";
import { useMemo } from "react";

type Lane = Allocation[];

function packIntoLanes(allocs: Allocation[]): Lane[] {
  const sorted = [...allocs].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  );
  const lanes: Lane[] = [];
  for (const a of sorted) {
    let placed = false;
    for (const lane of lanes) {
      const last = lane[lane.length - 1];
      if (last.end_date < a.start_date) {
        lane.push(a);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([a]);
  }
  return lanes;
}

export function AllocationTimeline({
  profiles,
  allocations,
  projects,
  phases,
  startDate,
  endDate,
  onEditAllocation,
}: {
  profiles: Profile[];
  allocations: Allocation[];
  projects: Project[];
  phases: ProjectPhase[];
  startDate: Date;
  endDate: Date;
  onEditAllocation: (a: Allocation) => void;
}) {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const totalMs = endMs - startMs;

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const phasesById = useMemo(
    () => new Map(phases.map((p) => [p.id, p])),
    [phases]
  );

  const months = useMemo(() => {
    const arr: {
      year: number;
      month: number;
      key: string;
      label: string;
      isCurrent: boolean;
    }[] = [];
    const today = new Date();
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
      arr.push({
        year: cur.getFullYear(),
        month: cur.getMonth(),
        key: `${cur.getFullYear()}-${cur.getMonth()}`,
        label: `T${cur.getMonth() + 1}`,
        isCurrent:
          cur.getFullYear() === today.getFullYear() &&
          cur.getMonth() === today.getMonth(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return arr;
  }, [startDate, endDate]);

  function pctFromDate(d: Date) {
    const t = Math.max(startMs, Math.min(endMs, d.getTime()));
    return ((t - startMs) / totalMs) * 100;
  }

  const today = new Date();
  const todayPct =
    today >= startDate && today <= endDate ? pctFromDate(today) : null;

  const userLanes = useMemo(() => {
    const map = new Map<string, Lane[]>();
    for (const p of profiles) {
      const allocs = allocations.filter((a) => a.user_id === p.id);
      map.set(p.id, packIntoLanes(allocs));
    }
    return map;
  }, [profiles, allocations]);

  const LEFT_W = 220;
  const MONTH_MIN_W = 88;
  const totalMinW = LEFT_W + months.length * MONTH_MIN_W;

  return (
    <TooltipProvider delayDuration={50}>
      <div className="rounded-2xl border bg-card overflow-x-auto">
        <div style={{ minWidth: totalMinW }}>
          {/* Header row */}
          <div className="flex border-b bg-muted/30 sticky top-0 z-20">
            <div
              className="shrink-0 sticky left-0 bg-muted/40 backdrop-blur-sm border-r z-10 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
              style={{ width: LEFT_W }}
            >
              Nhân sự · {profiles.length}
            </div>
            <div className="flex flex-1">
              {months.map((m) => (
                <div
                  key={m.key}
                  className={cn(
                    "flex-1 py-3 text-xs text-center border-l border-border/60",
                    m.isCurrent
                      ? "text-indigo-500 font-semibold bg-indigo-500/10"
                      : "text-muted-foreground"
                  )}
                  style={{ minWidth: MONTH_MIN_W }}
                >
                  <div>{m.label}</div>
                  <div className="text-[9px] opacity-60">
                    {String(m.year).slice(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {profiles.map((p) => {
              const lanes = userLanes.get(p.id) ?? [];
              const rowHeight = Math.max(60, lanes.length * 30 + 20);
              const load = userLoadToday(p.id, allocations, today);
              return (
                <div
                  key={p.id}
                  className="flex items-stretch hover:bg-muted/20 transition-colors"
                >
                  {/* Left: person info */}
                  <div
                    className="shrink-0 sticky left-0 bg-card/95 backdrop-blur-sm border-r z-10 px-4 py-3 flex items-center gap-3"
                    style={{ width: LEFT_W, minHeight: rowHeight }}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs">
                        {p.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">
                        {p.full_name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {p.role}
                      </div>
                    </div>
                    {load > 0 && (
                      <Badge
                        variant={
                          load > 1.2
                            ? "destructive"
                            : load > 1
                            ? "warning"
                            : load < 0.5
                            ? "info"
                            : "success"
                        }
                        className="shrink-0 text-[10px]"
                      >
                        {formatPercent(load)}
                      </Badge>
                    )}
                  </div>

                  {/* Right: timeline */}
                  <div className="flex-1 relative">
                    <div
                      className="relative"
                      style={{ height: rowHeight }}
                    >
                      {/* Month gridlines */}
                      {months.map((m, i) => (
                        <div
                          key={m.key}
                          className={cn(
                            "absolute top-0 bottom-0 border-l border-border/40",
                            m.isCurrent && "bg-indigo-500/[0.04]"
                          )}
                          style={{
                            left: `${(i / months.length) * 100}%`,
                            width: `${(1 / months.length) * 100}%`,
                          }}
                        />
                      ))}

                      {/* Today line */}
                      {todayPct !== null && (
                        <div
                          className="absolute top-0 bottom-0 z-10 pointer-events-none"
                          style={{ left: `${todayPct}%` }}
                        >
                          <div className="w-px h-full bg-rose-500/70" />
                          <div
                            className="absolute top-1 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-500"
                            style={{ left: 0.5 }}
                          />
                        </div>
                      )}

                      {/* Bars */}
                      {lanes.map((lane, laneIdx) =>
                        lane.map((a) => {
                          const s = new Date(a.start_date);
                          const e = new Date(a.end_date);
                          if (e.getTime() < startMs || s.getTime() > endMs)
                            return null;
                          const left = pctFromDate(s);
                          const width = Math.max(2, pctFromDate(e) - left);
                          const proj = projectsById.get(a.project_id);
                          const phase = a.phase_id
                            ? phasesById.get(a.phase_id)
                            : null;
                          const projColor = proj?.color ?? "#6366f1";

                          return (
                            <Tooltip key={a.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onEditAllocation(a)}
                                  className="absolute rounded-md text-[11px] text-white font-medium px-2 truncate hover:ring-2 hover:ring-foreground/40 hover:z-20 transition-all shadow-sm flex items-center gap-1 text-left"
                                  style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    top: laneIdx * 30 + 10,
                                    height: 24,
                                    background: `linear-gradient(135deg, ${projColor}, ${projColor}cc)`,
                                    boxShadow: `0 2px 8px -2px ${projColor}66`,
                                  }}
                                >
                                  <span className="truncate flex-1">
                                    {proj?.name ?? "?"}
                                  </span>
                                  <span className="opacity-80 shrink-0 tabular-nums">
                                    {Math.round(a.percent * 100)}%
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="font-medium flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: projColor }}
                                  />
                                  {proj?.name}
                                </div>
                                {phase && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {phase.phase_name}
                                  </div>
                                )}
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  {formatDate(a.start_date)} →{" "}
                                  {formatDate(a.end_date)}
                                </div>
                                <div className="text-[11px] font-medium mt-0.5">
                                  {formatPercent(a.percent)}
                                </div>
                                {a.note && (
                                  <div className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
                                    {a.note}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {profiles.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-10">
                Chưa có nhân sự nào.
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

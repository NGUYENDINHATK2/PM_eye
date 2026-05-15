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

// Distinct vibrant palette — dùng cho người khi group-by-project.
const PERSON_PALETTE = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
  "#a855f7", // purple
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
];

function colorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PERSON_PALETTE[h % PERSON_PALETTE.length];
}

// Darken/lighten a hex color by percent (-100..100).
function shade(hex: string, percent: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const num = parseInt(m, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

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

export type GroupBy = "person" | "project";
export type Density = "compact" | "normal" | "comfy";

export function AllocationTimeline({
  profiles,
  allocations,
  projects,
  phases,
  startDate,
  endDate,
  onEditAllocation,
  groupBy = "person",
  density = "normal",
}: {
  profiles: Profile[];
  allocations: Allocation[];
  projects: Project[];
  phases: ProjectPhase[];
  startDate: Date;
  endDate: Date;
  onEditAllocation: (a: Allocation) => void;
  groupBy?: GroupBy;
  density?: Density;
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
  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
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

  // Density tunings — padTop/padBot là khoảng đệm trên/dưới row
  const sizes = {
    compact: { left: 200, barH: 22, laneStep: 28, rowMin: 56, monthMinW: 70, headerH: 50, padTop: 10, padBot: 12 },
    normal: { left: 240, barH: 30, laneStep: 36, rowMin: 76, monthMinW: 96, headerH: 64, padTop: 14, padBot: 16 },
    comfy: { left: 260, barH: 36, laneStep: 44, rowMin: 92, monthMinW: 120, headerH: 72, padTop: 18, padBot: 20 },
  }[density];

  // ─── ROW MODEL ───
  type Row =
    | {
        kind: "person";
        profile: Profile;
        lanes: Lane[];
      }
    | {
        kind: "project";
        project: Project;
        lanes: Lane[];
      };

  const rows = useMemo<Row[]>(() => {
    if (groupBy === "person") {
      return profiles.map((p) => ({
        kind: "person" as const,
        profile: p,
        lanes: packIntoLanes(allocations.filter((a) => a.user_id === p.id)),
      }));
    }
    return projects.map((proj) => ({
      kind: "project" as const,
      project: proj,
      lanes: packIntoLanes(
        allocations.filter((a) => a.project_id === proj.id)
      ),
    }));
  }, [groupBy, profiles, projects, allocations]);

  const totalMinW = sizes.left + months.length * sizes.monthMinW;

  return (
    <TooltipProvider delayDuration={50}>
      <div className="rounded-2xl border bg-card overflow-x-auto">
        <div style={{ minWidth: totalMinW }}>
          {/* Header */}
          <div className="flex border-b bg-muted/30 sticky top-0 z-30" style={{ height: sizes.headerH }}>
            <div
              className="shrink-0 sticky left-0 bg-muted/40 backdrop-blur-sm border-r z-20 px-4 flex flex-col justify-center"
              style={{ width: sizes.left }}
            >
              <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                {groupBy === "person" ? "Nhân sự" : "Dự án"} · {rows.length}
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                {density === "compact" && "Compact"}
                {density === "normal" && "Normal"}
                {density === "comfy" && "Comfortable"} · {months.length} tháng
              </div>
            </div>
            <div className="flex flex-1">
              {months.map((m) => (
                <div
                  key={m.key}
                  className={cn(
                    "flex-1 flex flex-col justify-center items-center border-l border-border/60 text-center",
                    m.isCurrent
                      ? "text-indigo-500 bg-indigo-500/[0.06]"
                      : "text-muted-foreground"
                  )}
                  style={{ minWidth: sizes.monthMinW }}
                >
                  <div className={cn("text-sm font-semibold", m.isCurrent && "text-indigo-500")}>
                    {m.label}
                  </div>
                  <div className="text-[10px] opacity-70">{m.year}</div>
                  {m.isCurrent && (
                    <div className="text-[9px] mt-0.5 font-medium uppercase tracking-wider">
                      Hiện tại
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {rows.map((row, idx) => {
              const rowHeight = Math.max(
                sizes.rowMin,
                sizes.padTop +
                  Math.max(1, row.lanes.length) * sizes.laneStep +
                  (sizes.padBot - (sizes.laneStep - sizes.barH))
              );
              return (
                <div
                  key={
                    row.kind === "person" ? row.profile.id : row.project.id
                  }
                  className="flex items-stretch hover:bg-muted/15 transition-colors animate-fade-up"
                  style={{ animationDelay: `${idx * 25}ms` }}
                >
                  {/* Left rail */}
                  <div
                    className="shrink-0 sticky left-0 bg-card/95 backdrop-blur-sm border-r z-10 px-4 flex items-center gap-3"
                    style={{ width: sizes.left, minHeight: rowHeight }}
                  >
                    {row.kind === "person" ? (
                      <PersonRail
                        profile={row.profile}
                        allocations={allocations}
                        today={today}
                      />
                    ) : (
                      <ProjectRail
                        project={row.project}
                        allocations={allocations}
                        profilesById={profilesById}
                      />
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 relative">
                    <div className="relative" style={{ height: rowHeight }}>
                      {/* Month columns */}
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
                          <div
                            className="w-0.5 h-full"
                            style={{
                              background:
                                "linear-gradient(to bottom, #f43f5e, #be123c)",
                              boxShadow: "0 0 8px rgb(244 63 94 / 0.5)",
                            }}
                          />
                          <div className="absolute -top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgb(244_63_94_/_0.8)] ring-2 ring-background" />
                        </div>
                      )}

                      {/* Bars */}
                      {row.lanes.map((lane, laneIdx) =>
                        lane.map((a) => {
                          const s = new Date(a.start_date);
                          const e = new Date(a.end_date);
                          if (e.getTime() < startMs || s.getTime() > endMs)
                            return null;
                          const left = pctFromDate(s);
                          const width = Math.max(1.5, pctFromDate(e) - left);
                          const proj = projectsById.get(a.project_id);
                          const profile = profilesById.get(a.user_id);
                          const phase = a.phase_id
                            ? phasesById.get(a.phase_id)
                            : null;
                          const color =
                            row.kind === "project"
                              ? colorForUser(profile?.id ?? "?")
                              : proj?.color ?? "#6366f1";

                          // primary label depends on grouping
                          const primary =
                            row.kind === "person"
                              ? proj?.name ?? "?"
                              : profile?.full_name ?? "?";

                          // initial for chip
                          const initial =
                            row.kind === "person"
                              ? proj?.name?.[0]?.toUpperCase() ?? "?"
                              : profile?.full_name?.[0]?.toUpperCase() ?? "?";

                          return (
                            <Tooltip key={a.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onEditAllocation(a)}
                                  className="absolute rounded-lg text-xs text-white font-semibold px-2 hover:ring-2 hover:ring-white/60 hover:z-20 transition-all flex items-center gap-1.5 text-left ring-1 ring-black/10 overflow-hidden"
                                  style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    top: sizes.padTop + laneIdx * sizes.laneStep,
                                    height: sizes.barH,
                                    background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -12)} 100%)`,
                                    boxShadow: `0 4px 14px -2px ${color}80, 0 0 0 1px ${color}30 inset`,
                                    textShadow: "0 1px 2px rgb(0 0 0 / 0.25)",
                                  }}
                                >
                                  <span
                                    className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]"
                                    style={{
                                      background: "rgb(255 255 255 / 0.25)",
                                      backdropFilter: "blur(2px)",
                                    }}
                                  >
                                    {initial}
                                  </span>
                                  <span className="truncate flex-1">
                                    {primary}
                                  </span>
                                  <span
                                    className="shrink-0 tabular-nums text-[11px] px-1 rounded"
                                    style={{
                                      background: "rgb(0 0 0 / 0.15)",
                                    }}
                                  >
                                    {Math.round(a.percent * 100)}%
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[260px]">
                                <div className="font-medium flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: proj?.color }}
                                  />
                                  {proj?.name}
                                </div>
                                <div className="text-[11px] text-foreground mt-0.5">
                                  {profile?.full_name} · {profile?.role}
                                </div>
                                {phase && (
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    Phase: {phase.phase_name}
                                  </div>
                                )}
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  {formatDate(a.start_date)} → {formatDate(a.end_date)}
                                </div>
                                <div className="text-xs font-semibold mt-1">
                                  {formatPercent(a.percent)}
                                </div>
                                {a.note && (
                                  <div className="text-[10px] text-muted-foreground mt-1 italic">
                                    {a.note}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })
                      )}

                      {/* Empty state for row */}
                      {row.lanes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground italic">
                            {row.kind === "person"
                              ? "Chưa có allocation"
                              : "Chưa có người"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {rows.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-10">
                Không có dữ liệu.
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function PersonRail({
  profile,
  allocations,
  today,
}: {
  profile: Profile;
  allocations: Allocation[];
  today: Date;
}) {
  const load = userLoadToday(profile.id, allocations, today);
  return (
    <>
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="text-xs">
          {profile.full_name?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm truncate">{profile.full_name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {profile.role}
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
    </>
  );
}

function ProjectRail({
  project,
  allocations,
  profilesById,
}: {
  project: Project;
  allocations: Allocation[];
  profilesById: Map<string, Profile>;
}) {
  const today = new Date();
  const activeMembers = new Set<string>();
  for (const a of allocations) {
    if (a.project_id !== project.id) continue;
    const s = new Date(a.start_date);
    const e = new Date(a.end_date);
    if (today >= s && today <= e) activeMembers.add(a.user_id);
  }
  const roles = new Set<string>();
  for (const uid of activeMembers) {
    const p = profilesById.get(uid);
    if (p) roles.add(p.role);
  }
  return (
    <>
      <div
        className="w-1.5 h-12 rounded-full shrink-0"
        style={{
          background: `linear-gradient(to bottom, ${project.color}, ${shade(project.color, -20)})`,
          boxShadow: `0 0 12px ${project.color}80, 0 0 0 1px ${project.color}`,
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm truncate">{project.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {activeMembers.size} người · {roles.size} role
        </div>
      </div>
      <Badge variant="secondary" className="shrink-0 text-[10px]">
        {project.status}
      </Badge>
    </>
  );
}

"use client";

import { userProjectBreakdownForMonth } from "@/lib/calculations";
import { cn, monthLabel } from "@/lib/utils";
import type { Allocation, Profile, Project } from "@/types/database";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Stacked area chart: tổng FTE đang dùng từng tháng, chia màu theo project.
 * Đường ngang ghi đè = headcount team (capacity ceiling).
 */
export function CapacityTrend({
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
  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const months = useMemo(() => {
    const arr: { year: number; month: number; key: string; label: string }[] = [];
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      arr.push({
        year: cur.getFullYear(),
        month: cur.getMonth() + 1,
        key,
        label: monthLabel(key),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return arr;
  }, [startDate, endDate]);

  // Build chart data: each row = a month, cols = each project FTE.
  // Also collect project meta for stacks + legend.
  const { data, stackedProjects, capacity } = useMemo(() => {
    const projectTotals = new Map<string, number>();
    const data: Record<string, number | string>[] = [];

    for (const m of months) {
      const row: Record<string, number | string> = { month: m.label };
      for (const p of profiles) {
        const breakdown = userProjectBreakdownForMonth(
          p.id,
          allocations,
          profilesById.get(p.id),
          projectsById,
          m.year,
          m.month
        );
        for (const b of breakdown) {
          row[b.projectId] = ((row[b.projectId] as number) ?? 0) + b.percent;
          projectTotals.set(
            b.projectId,
            (projectTotals.get(b.projectId) ?? 0) + b.percent
          );
        }
      }
      data.push(row);
    }

    // Sort projects by total over the range desc
    const sorted = Array.from(projectTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => {
        const proj = projectsById.get(id);
        return { id, name: proj?.name ?? "?", color: proj?.color ?? "#888" };
      });

    const capacity = profiles.length;

    return { data, stackedProjects: sorted, capacity };
  }, [months, profiles, allocations, profilesById, projectsById]);

  const today = new Date();
  const currentLabel = monthLabel(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );

  // Empty state
  if (stackedProjects.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <div className="text-sm font-medium">Chưa có allocation nào</div>
        <div className="text-xs text-muted-foreground mt-1">
          Phân bổ nhân sự vào dự án để xem trend FTE qua thời gian.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold text-base">FTE đang dùng theo tháng</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Stack theo dự án · đường ngang = headcount tối đa ({capacity} người)
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {stackedProjects.length} dự án
        </div>
      </div>

      <div className="h-[360px] px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <defs>
              {stackedProjects.map((p) => (
                <linearGradient
                  key={p.id}
                  id={`cap-${p.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={p.color} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={p.color} stopOpacity={0.35} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v) => `${v.toFixed(0)}`}
            />
            <Tooltip
              cursor={{
                stroke: "hsl(var(--muted-foreground))",
                strokeDasharray: "3 3",
                strokeOpacity: 0.4,
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const total = payload.reduce(
                  (s, p) => s + (Number(p.value) || 0),
                  0
                );
                const sorted = [...payload].sort(
                  (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)
                );
                return (
                  <div className="rounded-lg border bg-popover/95 backdrop-blur-md px-3 py-2.5 shadow-lg text-xs min-w-[200px]">
                    <div className="flex justify-between items-baseline gap-3 mb-1.5">
                      <span className="font-semibold">{label}</span>
                      <span className="tnum font-semibold text-primary">
                        {total.toFixed(1)} FTE
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-48 overflow-auto no-scrollbar">
                      {sorted
                        .filter((p) => Number(p.value) > 0.01)
                        .map((p) => {
                          const meta = stackedProjects.find((x) => x.id === p.dataKey);
                          return (
                            <div
                              key={p.dataKey as string}
                              className="flex justify-between gap-3 items-center"
                            >
                              <span className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: meta?.color ?? "#888" }}
                                />
                                <span className="truncate">{meta?.name ?? "?"}</span>
                              </span>
                              <span className="tnum">
                                {(Number(p.value) || 0).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    <div className="flex justify-between gap-3 pt-1.5 mt-1.5 border-t text-[11px]">
                      <span className="text-muted-foreground">Tổng / Capacity</span>
                      <span className={cn(
                        "tnum font-medium",
                        total > capacity ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {total.toFixed(1)} / {capacity}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={capacity}
              stroke="hsl(var(--rose))"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Capacity ${capacity}`,
                position: "insideTopRight",
                fill: "hsl(var(--rose))",
                fontSize: 10,
              }}
            />
            <ReferenceLine
              x={currentLabel}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity={0.45}
              label={{
                value: "Hiện tại",
                position: "top",
                fill: "hsl(var(--primary))",
                fontSize: 10,
              }}
            />
            {stackedProjects.map((p) => (
              <Area
                key={p.id}
                type="monotone"
                dataKey={p.id}
                name={p.name}
                stackId="a"
                stroke={p.color}
                strokeWidth={1.5}
                fill={`url(#cap-${p.id})`}
                animationDuration={700}
              />
            ))}
            <Legend
              verticalAlign="bottom"
              height={28}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
              formatter={(value) => (
                <span className="text-muted-foreground">{value}</span>
              )}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

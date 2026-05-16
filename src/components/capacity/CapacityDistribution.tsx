"use client";

import { userLoadForMonth } from "@/lib/calculations";
import { cn, monthLabel } from "@/lib/utils";
import type { Allocation, Profile } from "@/types/database";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Bucket = "bench" | "underused" | "healthy" | "overloaded" | "burnout";

const BUCKETS: { id: Bucket; label: string; color: string; min: number; max: number }[] = [
  { id: "bench", label: "Bench (0%)", color: "hsl(var(--muted-foreground) / 0.4)", min: 0, max: 0 },
  { id: "underused", label: "Còn rảnh (1-50%)", color: "hsl(199 89% 55%)", min: 0.001, max: 0.499 },
  { id: "healthy", label: "Hợp lý (50-100%)", color: "hsl(158 64% 50%)", min: 0.5, max: 1.0 },
  { id: "overloaded", label: "Quá tải (100-120%)", color: "hsl(38 92% 55%)", min: 1.001, max: 1.2 },
  { id: "burnout", label: "Burnout (>120%)", color: "hsl(351 95% 60%)", min: 1.201, max: Infinity },
];

function classify(load: number): Bucket {
  if (load === 0) return "bench";
  if (load < 0.5) return "underused";
  if (load <= 1.0) return "healthy";
  if (load <= 1.2) return "overloaded";
  return "burnout";
}

/**
 * Stacked bar chart: mỗi tháng = 1 cột chia theo bucket health
 * (bench / underused / healthy / overloaded / burnout).
 * Nhìn 1 phát biết toàn team đang nằm phần lớn ở bucket nào.
 */
export function CapacityDistribution({
  profiles,
  allocations,
  startDate,
  endDate,
}: {
  profiles: Profile[];
  allocations: Allocation[];
  startDate: Date;
  endDate: Date;
}) {
  const today = new Date();

  const months = useMemo(() => {
    const arr: { year: number; month: number; key: string; label: string; isCurrent: boolean }[] = [];
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      arr.push({
        year: cur.getFullYear(),
        month: cur.getMonth() + 1,
        key,
        label: monthLabel(key),
        isCurrent:
          cur.getFullYear() === today.getFullYear() &&
          cur.getMonth() === today.getMonth(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return arr;
  }, [startDate, endDate, today]);

  const data = useMemo(() => {
    return months.map((m) => {
      const counts: Record<Bucket, number> = {
        bench: 0,
        underused: 0,
        healthy: 0,
        overloaded: 0,
        burnout: 0,
      };
      for (const p of profiles) {
        const load = userLoadForMonth(p.id, allocations, m.year, m.month);
        counts[classify(load)]++;
      }
      return { month: m.label, ...counts, isCurrent: m.isCurrent };
    });
  }, [months, profiles, allocations]);

  const currentMonth = data.find((d) => d.isCurrent);

  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <div className="text-sm font-medium">Chưa có nhân sự</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mini summary cards for current month */}
      {currentMonth && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {BUCKETS.map((b) => {
            const count = currentMonth[b.id] as number;
            const pct = profiles.length > 0 ? (count / profiles.length) * 100 : 0;
            return (
              <div
                key={b.id}
                className="rounded-xl border bg-card p-3 relative overflow-hidden"
              >
                <div
                  aria-hidden
                  className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-40"
                  style={{ background: b.color }}
                />
                <div className="relative">
                  <div
                    className="w-2 h-2 rounded-full mb-1.5"
                    style={{
                      background: b.color,
                      boxShadow: `0 0 8px ${b.color}`,
                    }}
                  />
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-tight">
                    {b.label}
                  </div>
                  <div className="text-2xl font-semibold tnum mt-1.5 leading-none">
                    {count}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {pct.toFixed(0)}% team
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stacked bar chart over time */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <div className="font-semibold text-base">
            Phân bố tình trạng team theo tháng
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Mỗi cột = 1 tháng, chia theo {profiles.length} người vào từng nhóm tải.
          </div>
        </div>

        <div className="h-[360px] px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
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
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent) / 0.3)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const total = payload.reduce(
                    (s, p) => s + (Number(p.value) || 0),
                    0
                  );
                  return (
                    <div className="rounded-lg border bg-popover/95 backdrop-blur-md px-3 py-2.5 shadow-lg text-xs min-w-[200px]">
                      <div className="flex justify-between gap-3 items-baseline mb-1.5">
                        <span className="font-semibold">{label}</span>
                        <span className="tnum text-muted-foreground">
                          {total} người
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {BUCKETS.map((b) => {
                          const v = payload.find((p) => p.dataKey === b.id);
                          const count = Number(v?.value) || 0;
                          if (count === 0) return null;
                          return (
                            <div
                              key={b.id}
                              className="flex justify-between gap-3 items-center"
                            >
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: b.color }}
                                />
                                {b.label}
                              </span>
                              <span className="tnum">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
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
              {BUCKETS.map((b) => (
                <Bar
                  key={b.id}
                  dataKey={b.id}
                  stackId="a"
                  name={b.label}
                  fill={b.color}
                  radius={[0, 0, 0, 0]}
                  animationDuration={600}
                >
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={b.color}
                      fillOpacity={d.isCurrent ? 1 : 0.85}
                      stroke={d.isCurrent ? "hsl(var(--primary))" : undefined}
                      strokeWidth={d.isCurrent ? 1 : 0}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Helper text */}
      <div
        className={cn(
          "rounded-xl border p-3 text-xs flex items-start gap-2",
          "bg-muted/30 border-border text-muted-foreground"
        )}
      >
        <span>💡</span>
        <span>
          View này dùng để{" "}
          <strong className="text-foreground">spot trends</strong>: tháng nào team
          quá tải thường xuyên (cột burnout/overloaded cao), tháng nào nhiều người
          bench (cột bench cao) → cân nhắc đẩy deal vào đúng thời điểm.
        </span>
      </div>
    </div>
  );
}

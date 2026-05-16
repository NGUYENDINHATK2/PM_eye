"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { userLoadForMonth } from "@/lib/calculations";
import { cn, monthLabel } from "@/lib/utils";
import type { Allocation, Profile } from "@/types/database";
import { AlertTriangle, Flame, Sparkles, TrendingUp } from "lucide-react";
import { useMemo } from "react";

/**
 * Forecast view: gauge utilization tháng hiện tại + bảng tóm tắt mỗi tháng
 * tới + 2 list actionable (bench / quá tải).
 */
export function CapacityForecast({
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

  const capacity = profiles.length;

  // Per-month aggregate
  const monthSummary = useMemo(() => {
    return months.map((m) => {
      let totalLoad = 0;
      let benchCount = 0;
      let overloadedCount = 0;
      let underusedCount = 0;
      for (const p of profiles) {
        const load = userLoadForMonth(p.id, allocations, m.year, m.month);
        totalLoad += load;
        if (load === 0) benchCount++;
        else if (load > 1.0) overloadedCount++;
        else if (load < 0.5) underusedCount++;
      }
      const utilization = capacity > 0 ? totalLoad / capacity : 0;
      const available = Math.max(0, capacity - totalLoad);
      return {
        ...m,
        totalLoad,
        benchCount,
        overloadedCount,
        underusedCount,
        utilization,
        available,
      };
    });
  }, [months, profiles, allocations, capacity]);

  const current = monthSummary.find((m) => m.isCurrent) ?? monthSummary[0];

  // Per-person for current month — danh sách bench & overload
  const peopleNow = useMemo(() => {
    if (!current) return { bench: [], overload: [] };
    const bench: { profile: Profile; load: number }[] = [];
    const overload: { profile: Profile; load: number }[] = [];
    for (const p of profiles) {
      const load = userLoadForMonth(
        p.id,
        allocations,
        current.year,
        current.month
      );
      if (load === 0) bench.push({ profile: p, load });
      else if (load > 1.0) overload.push({ profile: p, load });
    }
    overload.sort((a, b) => b.load - a.load);
    return { bench, overload };
  }, [current, profiles, allocations]);

  if (!current) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <div className="text-sm font-medium">Chưa có data</div>
      </div>
    );
  }

  const utilColor =
    current.utilization > 1.0
      ? "hsl(var(--rose))"
      : current.utilization > 0.85
      ? "hsl(var(--amber))"
      : current.utilization > 0.5
      ? "hsl(var(--emerald))"
      : "hsl(var(--sky))";

  return (
    <div className="space-y-4">
      {/* Hero: gauge + key stats */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
        {/* Gauge */}
        <div className="rounded-2xl border bg-card p-6 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-30"
            style={{ background: utilColor }}
          />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Utilization {current.label} · hiện tại
            </div>
            <div className="flex items-baseline gap-3 mt-1.5">
              <div
                className="text-5xl font-bold tnum tracking-tight"
                style={{ color: utilColor }}
              >
                {Math.round(current.utilization * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {current.totalLoad.toFixed(1)} / {capacity} FTE
              </div>
            </div>

            {/* Gauge bar */}
            <div className="mt-4 relative h-3 bg-muted rounded-full overflow-hidden">
              {/* "Safe zone" marker at 85% */}
              <div
                aria-hidden
                className="absolute top-0 bottom-0 w-px bg-amber-500/50 z-10"
                style={{ left: "85%" }}
              />
              {/* "Capacity" marker at 100% */}
              <div
                aria-hidden
                className="absolute top-0 bottom-0 w-px bg-rose-500/60 z-10"
                style={{ left: "100%" }}
              />
              {/* Actual */}
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${Math.min(140, current.utilization * 100)}%`,
                  background: `linear-gradient(90deg, ${utilColor}aa, ${utilColor})`,
                  boxShadow: `0 0 12px ${utilColor}88`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground/80 mt-1.5 font-mono">
              <span>0</span>
              <span>50%</span>
              <span className="text-amber-500">85%</span>
              <span className="text-rose-500">100%</span>
              <span>+</span>
            </div>

            <div className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {current.utilization > 1.0 ? (
                <>
                  ⚠ Team đang{" "}
                  <strong className="text-rose-600 dark:text-rose-400">
                    over-allocate
                  </strong>{" "}
                  ~{Math.round((current.utilization - 1) * capacity * 10) / 10} FTE.
                  Cân nhắc rebalance hoặc dời timeline.
                </>
              ) : current.utilization > 0.85 ? (
                <>
                  Team{" "}
                  <strong className="text-amber-600 dark:text-amber-400">
                    gần full
                  </strong>
                  . Còn ~{current.available.toFixed(1)} FTE nhận thêm scope nhỏ.
                </>
              ) : current.utilization > 0.5 ? (
                <>
                  Team{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    healthy
                  </strong>
                  . Còn ~{current.available.toFixed(1)} FTE để nhận thêm deal.
                </>
              ) : (
                <>
                  Team đang{" "}
                  <strong className="text-sky-600 dark:text-sky-400">
                    underused
                  </strong>{" "}
                  ({current.available.toFixed(1)} FTE rảnh) — đẩy thêm sales pipeline?
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mini KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <ForecastTile
            label="Đang bench"
            value={peopleNow.bench.length.toString()}
            tone="sky"
            icon={<Sparkles size={14} />}
            hint={peopleNow.bench.length > 0 ? "Có thể đẩy vào deal mới" : "Không ai rảnh"}
          />
          <ForecastTile
            label="Quá tải"
            value={peopleNow.overload.length.toString()}
            tone={peopleNow.overload.length > 0 ? "rose" : "emerald"}
            icon={<Flame size={14} />}
            hint={peopleNow.overload.length > 0 ? "Burnout risk!" : "Không có ai burnout"}
          />
          <ForecastTile
            label="FTE rảnh"
            value={current.available.toFixed(1)}
            tone="emerald"
            icon={<TrendingUp size={14} />}
            hint={`/ ${capacity} FTE tổng`}
          />
          <ForecastTile
            label="Under 50%"
            value={current.underusedCount.toString()}
            tone="amber"
            icon={<AlertTriangle size={14} />}
            hint="Còn slot rảnh"
          />
        </div>
      </div>

      {/* Two columns: bench list + overload list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PersonList
          title="Đang bench"
          subtitle={`${peopleNow.bench.length} người ${current.label}`}
          tone="sky"
          icon={<Sparkles size={14} />}
          items={peopleNow.bench}
          emptyText="Cả team đều có việc làm 👍"
        />
        <PersonList
          title="Quá tải"
          subtitle={`${peopleNow.overload.length} người ${current.label}`}
          tone="rose"
          icon={<Flame size={14} />}
          items={peopleNow.overload}
          emptyText="Không có ai burnout ✓"
        />
      </div>

      {/* Per-month upcoming forecast strip */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="font-semibold text-base">Forecast các tháng tới</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Mỗi tháng = utilization tổng / số người bench / số người quá tải.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-5 py-2 font-medium">Tháng</th>
                <th className="text-left px-3 py-2 font-medium">Utilization</th>
                <th className="text-right px-3 py-2 font-medium">FTE rảnh</th>
                <th className="text-right px-3 py-2 font-medium">Bench</th>
                <th className="text-right px-5 py-2 font-medium">Quá tải</th>
              </tr>
            </thead>
            <tbody>
              {monthSummary.map((m) => {
                const c =
                  m.utilization > 1.0
                    ? "hsl(var(--rose))"
                    : m.utilization > 0.85
                    ? "hsl(var(--amber))"
                    : m.utilization > 0.5
                    ? "hsl(var(--emerald))"
                    : "hsl(var(--sky))";
                return (
                  <tr
                    key={m.key}
                    className={cn(
                      "border-b last:border-b-0 hover:bg-muted/20 transition",
                      m.isCurrent && "bg-primary/[0.04]"
                    )}
                  >
                    <td className="px-5 py-2.5">
                      <span className="font-medium">{m.label}</span>
                      {m.isCurrent && (
                        <Badge variant="brand" className="ml-2 text-[9px] py-0">
                          NAY
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[180px]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(140, m.utilization * 100)}%`,
                              background: c,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-medium tnum"
                          style={{ color: c }}
                        >
                          {Math.round(m.utilization * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tnum text-muted-foreground">
                      {m.available.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-right tnum">
                      {m.benchCount > 0 ? (
                        <span className="text-sky-500">{m.benchCount}</span>
                      ) : (
                        <span className="text-muted-foreground">·</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right tnum">
                      {m.overloadedCount > 0 ? (
                        <span className="text-rose-500 font-medium">
                          {m.overloadedCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">·</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type ToneKey = "sky" | "rose" | "emerald" | "amber";
const toneMap: Record<ToneKey, { bg: string; border: string; text: string; iconBg: string }> = {
  sky: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-500/10",
  },
  rose: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10",
  },
  emerald: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  amber: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
  },
};

function ForecastTile({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string;
  value: string;
  tone: ToneKey;
  icon: React.ReactNode;
  hint?: string;
}) {
  const t = toneMap[tone];
  return (
    <div className={cn("rounded-xl border p-3.5", t.bg, t.border)}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center", t.iconBg, t.text)}>
          {icon}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <div className={cn("text-2xl font-semibold tnum tracking-tight", t.text)}>
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
      )}
    </div>
  );
}

function PersonList({
  title,
  subtitle,
  tone,
  icon,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  tone: ToneKey;
  icon: React.ReactNode;
  items: { profile: Profile; load: number }[];
  emptyText: string;
}) {
  const t = toneMap[tone];
  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center", t.iconBg, t.text)}>
          {icon}
        </span>
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="px-3 pb-3">
        {items.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-1">
            {items.map(({ profile, load }) => (
              <div
                key={profile.id}
                className={cn(
                  "flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/40 transition"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {profile.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">
                    {profile.full_name}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {profile.role}
                  </div>
                </div>
                <Badge
                  variant={tone === "rose" ? "destructive" : "info"}
                  className="tnum text-[10px]"
                >
                  {load === 0 ? "0%" : `${Math.round(load * 100)}%`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

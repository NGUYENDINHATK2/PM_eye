"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userLoadForMonth } from "@/lib/calculations";
import { cn, monthLabel } from "@/lib/utils";
import type { Allocation, Profile } from "@/types/database";
import { useMemo } from "react";

export function AvailableByRole({
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

  // Group profiles by role
  const byRole = useMemo(() => {
    const map = new Map<string, Profile[]>();
    for (const p of profiles) {
      if (!p.is_active) continue;
      const list = map.get(p.role) ?? [];
      list.push(p);
      map.set(p.role, list);
    }
    return Array.from(map.entries())
      .map(([role, list]) => ({ role, members: list }))
      .sort((a, b) => b.members.length - a.members.length);
  }, [profiles]);

  function cellTone(available: number, headcount: number) {
    if (headcount === 0) return { bg: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" };
    if (available < 0)
      return {
        bg: "linear-gradient(135deg, hsl(351 95% 60%), hsl(330 81% 55%))",
        color: "white",
      };
    if (available < 0.3)
      return {
        bg: "linear-gradient(135deg, hsl(38 92% 55%), hsl(27 87% 55%))",
        color: "white",
      };
    if (available < 1)
      return {
        bg: "hsl(38 92% 55% / 0.15)",
        color: "hsl(38 92% 35%)",
      };
    if (available < 2)
      return {
        bg: "hsl(158 64% 50% / 0.18)",
        color: "hsl(158 64% 40%)",
      };
    return {
      bg: "linear-gradient(135deg, hsl(158 64% 50%), hsl(173 58% 45%))",
      color: "white",
    };
  }

  return (
    <TooltipProvider delayDuration={50}>
      <div className="rounded-2xl border bg-card overflow-x-auto">
        <div className="min-w-[800px]">
          <table className="w-full border-separate border-spacing-y-2 border-spacing-x-2 p-3">
            <thead>
              <tr>
                <th className="text-left pb-3 pl-2 sticky left-0 bg-card z-10 min-w-[220px]">
                  <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                    Role
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5 font-normal normal-case">
                    Số người · FTE available / FTE tổng
                  </div>
                </th>
                {months.map((m) => (
                  <th
                    key={m.key}
                    className={cn(
                      "text-center pb-3 min-w-[90px]",
                      m.isCurrent && "text-indigo-500"
                    )}
                  >
                    <div className="text-xs font-semibold">
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
              {byRole.length === 0 && (
                <tr>
                  <td
                    colSpan={months.length + 1}
                    className="text-center py-10 text-sm text-muted-foreground"
                  >
                    Chưa có nhân sự nào active.
                  </td>
                </tr>
              )}
              {byRole.map(({ role, members }, idx) => {
                const headcount = members.length;
                return (
                  <tr
                    key={role}
                    className="animate-fade-up"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <td className="pl-2 sticky left-0 bg-card z-10">
                      <div className="font-medium text-sm">{role}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {headcount} người
                      </div>
                    </td>
                    {months.map((m) => {
                      // total allocated FTE for this role in this month
                      let allocated = 0;
                      for (const member of members) {
                        const load = userLoadForMonth(
                          member.id,
                          allocations,
                          m.year,
                          m.month
                        );
                        allocated += load;
                      }
                      const available = headcount - allocated;
                      const tone = cellTone(available, headcount);
                      return (
                        <td
                          key={m.key}
                          className="p-0 text-center align-middle"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 relative",
                                  m.isCurrent && "ring-2 ring-indigo-500/40"
                                )}
                                style={{
                                  background: tone.bg,
                                  color: tone.color,
                                }}
                              >
                                <div className="text-base font-bold tnum leading-tight">
                                  {available >= 0
                                    ? available.toFixed(1)
                                    : `−${Math.abs(available).toFixed(1)}`}
                                </div>
                                <div className="text-[9px] opacity-80 leading-tight">
                                  /{headcount} FTE
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[260px]">
                              <div className="font-medium text-xs">
                                {role} · {monthLabel(m.key)}
                              </div>
                              <div className="text-[11px] mt-1 space-y-0.5">
                                <div className="flex justify-between gap-3">
                                  <span className="text-muted-foreground">
                                    Tổng người
                                  </span>
                                  <span className="tnum">{headcount}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span className="text-muted-foreground">
                                    Đã phân bổ
                                  </span>
                                  <span className="tnum">
                                    {allocated.toFixed(2)} FTE
                                  </span>
                                </div>
                                <div className="flex justify-between gap-3 pt-1 mt-1 border-t border-border font-medium">
                                  <span>Còn rảnh</span>
                                  <span
                                    className={cn(
                                      "tnum",
                                      available < 0
                                        ? "text-rose-500"
                                        : available < 0.3
                                        ? "text-amber-500"
                                        : "text-emerald-500"
                                    )}
                                  >
                                    {available.toFixed(2)} FTE
                                  </span>
                                </div>
                              </div>
                              {available < 0 && (
                                <div className="text-[10px] text-rose-500 mt-1 italic">
                                  ⚠️ Đã over-allocate role này
                                </div>
                              )}
                              {available >= 1 && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 italic">
                                  ✓ Có thể nhận thêm dự án
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

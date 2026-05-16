"use client";

import { Card, CardContent } from "@/components/ui/card";
import { userLoadCurrentMonth, userLoadToday } from "@/lib/calculations";
import { formatPercent } from "@/lib/utils";
import type { Allocation, Profile } from "@/types/database";
import { Activity, Flame, Sparkles, Users } from "lucide-react";

export function CapacityStats({
  profiles,
  allocations,
}: {
  profiles: Profile[];
  allocations: Allocation[];
}) {
  const today = new Date();
  const active = profiles.filter((p) => p.is_active);
  let burnoutCount = 0;
  let benchCount = 0;
  let underusedCount = 0;
  let totalLoad = 0;
  // TODAY load để khớp với /allocations badges + /employees grid.
  // monthLoad cho smart-bench (chỉ tính bench khi today=0 VÀ tháng=0).
  for (const p of active) {
    const load = userLoadToday(p.id, allocations, today);
    const monthLoad = userLoadCurrentMonth(p.id, allocations, today);
    totalLoad += load;
    if (load > 1.0) burnoutCount++;
    else if (load === 0 && monthLoad === 0) benchCount++;
    else if (load > 0 && load < 0.5) underusedCount++;
  }
  const avgLoad = active.length > 0 ? totalLoad / active.length : 0;
  const totalAvailable = active.length - totalLoad; // FTE available

  const stats = [
    {
      label: "Tổng team active",
      value: active.length.toString(),
      hint: "người",
      icon: Users,
      tone: "from-indigo-500/30 to-indigo-500/10",
      iconTone: "bg-indigo-500/10 text-indigo-500",
    },
    {
      label: "Tải hôm nay",
      value: formatPercent(avgLoad),
      hint: `${totalLoad.toFixed(1)} / ${active.length} FTE đang dùng`,
      icon: Activity,
      tone: "from-emerald-500/30 to-emerald-500/10",
      iconTone: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Đang burnout",
      value: burnoutCount.toString(),
      hint: burnoutCount > 0 ? "người quá tải > 100%" : "không ai quá tải",
      icon: Flame,
      tone:
        burnoutCount > 0
          ? "from-rose-500/30 to-rose-500/10"
          : "from-muted to-muted",
      iconTone:
        burnoutCount > 0
          ? "bg-rose-500/10 text-rose-500"
          : "bg-muted text-muted-foreground",
    },
    {
      label: "Còn rảnh",
      value: Math.max(0, totalAvailable).toFixed(1),
      hint:
        benchCount > 0
          ? `${benchCount} bench · ${underusedCount} <50%`
          : `${underusedCount} người <50%`,
      icon: Sparkles,
      tone: "from-sky-500/30 to-sky-500/10",
      iconTone: "bg-sky-500/10 text-sky-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <Card
          key={s.label}
          className="relative overflow-hidden animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div
            className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${s.tone} blur-3xl opacity-60`}
          />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-lg ${s.iconTone} flex items-center justify-center`}
              >
                <s.icon size={15} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {s.label}
            </div>
            <div className="text-2xl font-semibold tracking-tight tnum mt-1.5">
              {s.value}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {s.hint}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

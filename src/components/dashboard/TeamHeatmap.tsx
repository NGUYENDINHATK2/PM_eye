"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  loadStatus,
  loadStatusLabel,
  userLoadForMonth,
} from "@/lib/calculations";
import { formatPercent, monthLabel } from "@/lib/utils";
import type { Allocation, Profile } from "@/types/database";

export function TeamHeatmap({
  profiles,
  allocations,
  monthsAhead = 6,
}: {
  profiles: Profile[];
  allocations: Allocation[];
  monthsAhead?: number;
}) {
  const today = new Date();
  const months = Array.from({ length: monthsAhead }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      isThisMonth: i === 0,
    };
  });

  function cellStyle(load: number): React.CSSProperties {
    if (load === 0) {
      return {
        background: "hsl(var(--muted))",
        color: "hsl(var(--muted-foreground))",
      };
    }
    if (load > 1.2) {
      return {
        background: "linear-gradient(135deg, hsl(351 95% 60%), hsl(330 81% 55%))",
        color: "white",
        boxShadow: "0 6px 20px -4px hsl(351 95% 60% / 0.5)",
      };
    }
    if (load > 1.0) {
      return {
        background: "linear-gradient(135deg, hsl(38 92% 55%), hsl(27 87% 55%))",
        color: "white",
        boxShadow: "0 4px 14px -4px hsl(38 92% 55% / 0.4)",
      };
    }
    if (load >= 0.5) {
      const intensity = Math.min(1, load);
      return {
        background: `linear-gradient(135deg, hsl(158 64% ${56 - intensity * 12}%), hsl(173 58% ${45 - intensity * 10}%))`,
        color: "white",
        boxShadow: `0 4px 14px -4px hsl(158 64% 50% / ${0.2 + intensity * 0.2})`,
      };
    }
    return {
      background: "hsl(199 89% 50% / 0.16)",
      color: "hsl(199 89% 50%)",
      border: "1px solid hsl(199 89% 50% / 0.2)",
    };
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="card-premium border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Heatmap năng lực team</CardTitle>
          <CardDescription>
            6 tháng tới — ai burn, ai rảnh, ai vừa đủ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-12">
              Chưa có nhân sự nào.
            </div>
          )}

          {profiles.length > 0 && (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full border-separate border-spacing-y-1.5 border-spacing-x-1.5">
                <thead>
                  <tr>
                    <th className="text-left eyebrow pb-3 pl-1 sticky left-0 bg-card z-10 min-w-[180px]">
                      Nhân sự
                    </th>
                    {months.map((m) => (
                      <th
                        key={m.key}
                        className={`eyebrow text-center pb-3 w-16 ${
                          m.isThisMonth ? "text-indigo-500" : ""
                        }`}
                      >
                        {monthLabel(m.key)}
                        {m.isThisMonth && (
                          <span className="block text-[8px] mt-0.5">NOW</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <td className="pl-1 sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px]">
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
                        return (
                          <td
                            key={m.key}
                            className="p-0 text-center align-middle relative"
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`h-10 rounded-lg flex items-center justify-center text-xs font-semibold tnum cursor-pointer transition-all duration-200 hover:scale-110 ${
                                    isCritical ? "animate-glow-pulse" : ""
                                  } ${
                                    m.isThisMonth ? "ring-1 ring-indigo-500/40" : ""
                                  }`}
                                  style={cellStyle(load)}
                                >
                                  {load > 0 ? Math.round(load * 100) + "%" : "·"}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="font-medium">{formatPercent(load)}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {loadStatusLabel(status)}
                                </div>
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
          )}

          <Legend />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function Legend() {
  const items = [
    { label: "Bench", swatch: "hsl(var(--muted))" },
    { label: "<50%", swatch: "hsl(199 89% 50% / 0.4)" },
    {
      label: "Healthy",
      swatch: "linear-gradient(135deg, hsl(158 64% 50%), hsl(173 58% 45%))",
    },
    {
      label: "Quá tải",
      swatch: "linear-gradient(135deg, hsl(38 92% 55%), hsl(27 87% 55%))",
    },
    {
      label: "Burnout",
      swatch: "linear-gradient(135deg, hsl(351 95% 60%), hsl(330 81% 55%))",
    },
  ];
  return (
    <div className="flex items-center gap-4 flex-wrap mt-6 pt-4 border-t text-xs text-muted-foreground">
      <span className="eyebrow">Thang nhiệt</span>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md" style={{ background: i.swatch }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

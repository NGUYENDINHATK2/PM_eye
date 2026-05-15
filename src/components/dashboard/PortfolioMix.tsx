"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Project } from "@/types/database";
import type { ProjectFinance } from "@/lib/calculations";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo } from "react";

export function PortfolioMix({
  items,
}: {
  items: { project: Project; finance: ProjectFinance }[];
}) {
  const data = useMemo(
    () =>
      items
        .filter((i) => i.finance.totalSpent > 0 || i.project.total_budget > 0)
        .map((i) => ({
          name: i.project.name,
          value: Math.max(i.finance.totalSpent, 1),
          color: i.project.color,
          spent: i.finance.totalSpent,
          budget: i.finance.budget,
        })),
    [items]
  );

  const totalSpent = data.reduce((s, d) => s + d.spent, 0);
  const totalBudget = data.reduce((s, d) => s + d.budget, 0);

  return (
    <Card className="card-premium border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Phân bổ chi phí theo dự án</CardTitle>
        <CardDescription>Tổng burn đã chi đến hôm nay</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-12">
            Chưa có chi phí ghi nhận.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div className="md:col-span-2 relative h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload as (typeof data)[0];
                      return (
                        <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-muted-foreground tnum">
                            {formatCurrency(item.spent)}
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Đã tiêu
                </div>
                <div className="text-base font-semibold tnum gradient-text-indigo">
                  {formatCurrency(totalSpent)}
                </div>
                {totalBudget > 0 && (
                  <div className="text-[10px] text-muted-foreground tnum mt-0.5">
                    /{formatCurrency(totalBudget)}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-3 space-y-2">
              {data.slice(0, 6).map((d) => {
                const pct = totalSpent > 0 ? (d.spent / totalSpent) * 100 : 0;
                return (
                  <div key={d.name} className="group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: d.color,
                            boxShadow: `0 0 0 3px ${d.color}22`,
                          }}
                        />
                        <span className="font-medium truncate">{d.name}</span>
                      </div>
                      <span className="tnum text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: d.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

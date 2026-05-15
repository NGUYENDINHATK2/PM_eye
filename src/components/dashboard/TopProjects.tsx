"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectFinance } from "@/lib/calculations";
import type { Project } from "@/types/database";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowUpRight, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type SortBy = "profit" | "revenue" | "spent";

export function TopProjects({
  items,
}: {
  items: { project: Project; finance: ProjectFinance }[];
}) {
  const [sortBy, setSortBy] = useState<SortBy>("profit");

  const sorted = [...items]
    .filter((i) => i.project.status !== "completed")
    .sort((a, b) => {
      if (sortBy === "profit") {
        // Only items with revenue make sense for profit ranking
        if (!a.finance.hasRevenue && !b.finance.hasRevenue) return 0;
        if (!a.finance.hasRevenue) return 1;
        if (!b.finance.hasRevenue) return -1;
        return b.finance.profit - a.finance.profit;
      }
      if (sortBy === "revenue") return b.finance.revenue - a.finance.revenue;
      return b.finance.totalSpent - a.finance.totalSpent;
    })
    .slice(0, 5);

  const maxValue =
    sorted.length > 0
      ? Math.max(
          ...sorted.map((i) =>
            sortBy === "profit"
              ? Math.abs(i.finance.profit)
              : sortBy === "revenue"
              ? i.finance.revenue
              : i.finance.totalSpent
          )
        )
      : 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy size={15} className="text-amber-500" />
              Top dự án
            </CardTitle>
            <CardDescription>
              {sortBy === "profit"
                ? "Sắp xếp theo lợi nhuận"
                : sortBy === "revenue"
                ? "Sắp xếp theo doanh thu"
                : "Sắp xếp theo chi phí"}
            </CardDescription>
          </div>
          <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
            {(["profit", "revenue", "spent"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSortBy(s)}
                className={cn(
                  "px-2.5 h-7 rounded-md text-[11px] font-medium transition",
                  sortBy === s
                    ? "bg-accent text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "profit" ? "Lợi nhuận" : s === "revenue" ? "Doanh thu" : "Chi phí"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Chưa có dự án nào.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((item, idx) => {
              const { project, finance } = item;
              const value =
                sortBy === "profit"
                  ? finance.profit
                  : sortBy === "revenue"
                  ? finance.revenue
                  : finance.totalSpent;
              const pct = Math.min(100, (Math.abs(value) / maxValue) * 100);
              const valueClass =
                sortBy === "profit"
                  ? value < 0
                    ? "text-rose-500"
                    : "text-emerald-500"
                  : sortBy === "revenue"
                  ? "text-emerald-500"
                  : "text-foreground";

              const medalBg =
                idx === 0
                  ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30"
                  : idx === 1
                  ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-slate-400/30"
                  : idx === 2
                  ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/30"
                  : "bg-muted text-muted-foreground";

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group block"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm",
                        medalBg
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              background: project.color,
                              boxShadow: `0 0 0 3px ${project.color}22`,
                            }}
                          />
                          <span className="font-medium text-sm truncate group-hover:text-indigo-500 transition">
                            {project.name}
                          </span>
                          <ArrowUpRight
                            size={11}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground"
                          />
                        </div>
                        <span className={cn("text-sm font-semibold tnum tabular-nums shrink-0", valueClass)}>
                          {sortBy === "profit" && value > 0 ? "+" : ""}
                          {formatCurrency(value)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-700 ease-out rounded-full"
                            style={{
                              width: `${pct}%`,
                              background:
                                sortBy === "profit"
                                  ? value < 0
                                    ? "linear-gradient(90deg, #fb7185, #f43f5e)"
                                    : "linear-gradient(90deg, #34d399, #10b981)"
                                  : `linear-gradient(90deg, ${project.color}, ${project.color}cc)`,
                            }}
                          />
                        </div>
                        {sortBy === "profit" && finance.hasRevenue && (
                          <Badge
                            variant={
                              finance.marginStatus === "loss"
                                ? "destructive"
                                : finance.marginStatus === "thin"
                                ? "warning"
                                : finance.marginStatus === "ok"
                                ? "info"
                                : "success"
                            }
                            className="text-[9px] tnum"
                          >
                            {formatPercent(finance.margin)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ProjectFinance } from "@/lib/calculations";
import type { Project } from "@/types/database";
import Link from "next/link";
import { Briefcase, ArrowUpRight } from "lucide-react";

export function ProjectHealth({
  items,
}: {
  items: { project: Project; finance: ProjectFinance }[];
}) {
  const ongoing = items.filter((i) => i.project.status === "ongoing");
  const list = (ongoing.length > 0 ? ongoing : items).slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sức khỏe dự án</CardTitle>
        <CardDescription>
          Ngân sách vs đã tiêu — tính đến hôm nay
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 && (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Briefcase size={16} className="text-muted-foreground" />
            </div>
            <div className="text-sm">Chưa có dự án nào.</div>
            <Link
              href="/projects"
              className="text-xs text-indigo-500 hover:underline mt-1 inline-block"
            >
              Tạo dự án đầu tiên →
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {list.map(({ project, finance }) => {
            const pct = Math.min(1.2, finance.utilization);
            const barGradient = finance.overBudget
              ? "linear-gradient(90deg, #fb7185, #f43f5e)"
              : finance.utilization > 0.85
              ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
              : "linear-gradient(90deg, #34d399, #10b981)";

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block group"
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: project.color,
                        boxShadow: `0 0 0 3px ${project.color}22`,
                      }}
                    />
                    <span className="font-medium text-sm truncate">
                      {project.name}
                    </span>
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-muted-foreground shrink-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {finance.overBudget && (
                      <Badge variant="destructive">Vượt</Badge>
                    )}
                    {!finance.overBudget && finance.utilization > 0.85 && (
                      <Badge variant="warning">Sắp hết</Badge>
                    )}
                    <span
                      className={`text-xs font-semibold tnum ${
                        finance.overBudget
                          ? "text-rose-500"
                          : finance.utilization > 0.85
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatPercent(finance.utilization)}
                    </span>
                  </div>
                </div>
                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, pct * 100)}%`,
                      background: barGradient,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 tnum">
                  <span>{formatCurrency(finance.totalSpent)}</span>
                  <span>của {formatCurrency(finance.budget)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

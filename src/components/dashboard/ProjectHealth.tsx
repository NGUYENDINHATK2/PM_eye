"use client";

import { HealthBadge } from "@/components/projects/HealthBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectFinance } from "@/lib/calculations";
import {
  projectHealth,
  type ProjectHealthScore,
} from "@/lib/project-health";
import { cn, formatPercent } from "@/lib/utils";
import type {
  Allocation,
  Profile,
  Project,
  ProjectPhase,
} from "@/types/database";
import { Briefcase, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function ProjectHealth({
  items,
  phases,
  allocations,
  profiles,
  canViewMoney,
}: {
  items: { project: Project; finance: ProjectFinance }[];
  phases: ProjectPhase[];
  allocations: Allocation[];
  profiles: Profile[];
  canViewMoney: boolean;
}) {
  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const scored = useMemo(() => {
    return items
      .filter((i) => i.project.status === "ongoing" || i.project.status === "planned")
      .map(({ project, finance }) => {
        const health = projectHealth({
          project,
          phases,
          allocations,
          profilesById,
          finance,
          canViewMoney,
        });
        return { project, finance, health };
      })
      .sort((a, b) => rankTone(b.health) - rankTone(a.health))
      .slice(0, 8);
  }, [items, phases, allocations, profilesById, canViewMoney]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sức khỏe dự án</CardTitle>
        <CardDescription>
          Staffing · Tiền · Tiến độ · Người — Đỏ / Vàng / Xanh
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 && (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
              <Briefcase size={16} className="text-muted-foreground" />
            </div>
            <div className="text-sm">Chưa có dự án nào.</div>
            <Link
              href="/projects"
              className="mt-1 inline-block text-xs text-teal-500 hover:underline"
            >
              Tạo dự án đầu tiên →
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {scored.map(({ project, finance, health }) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block rounded-xl px-1 py-1.5 transition hover:bg-muted/40"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background: project.color,
                      boxShadow: `0 0 0 3px ${project.color}22`,
                    }}
                  />
                  <span className="truncate text-sm font-medium">
                    {project.name}
                  </span>
                  <ArrowUpRight
                    size={12}
                    className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100"
                  />
                </div>
                <HealthBadge health={health} compact />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {health.axes.slice(0, 4).map((ax) => (
                  <span
                    key={ax.key}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border/50"
                    )}
                  >
                    {ax.label}: {ax.detail}
                  </span>
                ))}
              </div>
              {canViewMoney && finance.hasCap && (
                <div className="mt-1.5 text-[10px] text-muted-foreground tnum">
                  Budget {formatPercent(finance.utilization)}
                </div>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function rankTone(h: ProjectHealthScore): number {
  return h.tone === "red" ? 3 : h.tone === "yellow" ? 2 : h.tone === "green" ? 1 : 0;
}

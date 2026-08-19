"use client";

import { PageHeader } from "@/components/PageHeader";
import {
  ProjectPortfolioTimeline,
  projectTimelineMeta,
} from "@/components/projects/ProjectPortfolioTimeline";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type StatusFilter = "all" | "ongoing" | "planned" | "paused" | "completed";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "ongoing", label: "Đang chạy" },
  { id: "planned", label: "Lên kế hoạch" },
  { id: "paused", label: "Tạm dừng" },
  { id: "completed", label: "Đã đóng" },
];

export default function TimelinePage() {
  const { data, loading } = useAppData();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const projects = data?.projects ?? [];

  const filtered = useMemo(() => {
    if (statusFilter === "all") return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const summary = useMemo(() => {
    const today = new Date();
    let soon = 0;
    let overdue = 0;
    let open = 0;
    for (const p of projects) {
      if (p.status === "completed") continue;
      const m = projectTimelineMeta(p, today);
      if (m.tone === "soon") soon += 1;
      if (m.tone === "overdue") overdue += 1;
      if (m.tone === "open") open += 1;
    }
    return { soon, overdue, open, total: projects.length };
  }, [projects]);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace · Tiến độ"
        title="Tiến độ dự án"
        subtitle="Timeline toàn portfolio — hạn gần, quá hạn, dự án không end kéo dài."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Tổng dự án" value={String(summary.total)} />
        <SummaryCard
          label="Sắp hết hạn"
          value={String(summary.soon)}
          tone="amber"
        />
        <SummaryCard
          label="Quá hạn"
          value={String(summary.overdue)}
          tone="rose"
        />
        <SummaryCard
          label="Không có end"
          value={String(summary.open)}
          tone="sky"
        />
      </div>

      <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-muted/40 p-1 ring-1 ring-border/50">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStatusFilter(s.id)}
            className={cn(
              "h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition",
              statusFilter === s.id
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ProjectPortfolioTimeline projects={filtered} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber" | "rose" | "sky";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "rose"
        ? "text-rose-700 dark:text-rose-300"
        : tone === "sky"
          ? "text-sky-700 dark:text-sky-300"
          : "text-foreground";

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border/70">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "font-display mt-1 text-2xl font-semibold tnum",
          toneClass
        )}
      >
        {value}
      </div>
    </div>
  );
}

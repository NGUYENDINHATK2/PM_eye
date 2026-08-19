"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";
import type { Project } from "@/types/database";
import { CalendarRange, Infinity as InfinityIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type RangeKey = "6mo" | "12mo" | "18mo";

const DAY_MS = 86_400_000;
const LABEL_W = 200;
const ROW_H = 44;

const STATUS_LABEL: Record<string, string> = {
  planned: "Lên kế hoạch",
  ongoing: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Đã đóng",
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / DAY_MS;
}

export type ProjectTimelineTone =
  | "ok"
  | "soon"
  | "overdue"
  | "open"
  | "paused"
  | "done"
  | "planned";

export function projectTimelineMeta(
  p: Project,
  today: Date = new Date()
): {
  tone: ProjectTimelineTone;
  daysToEnd: number | null;
  openEnded: boolean;
  label: string;
} {
  const end = parseDate(p.end_date);
  const openEnded = !end;

  if (p.status === "completed") {
    return { tone: "done", daysToEnd: null, openEnded, label: "Đã đóng" };
  }
  if (p.status === "paused") {
    return {
      tone: "paused",
      daysToEnd: end ? Math.ceil(daysBetween(today, end)) : null,
      openEnded,
      label: "Tạm dừng",
    };
  }
  if (p.status === "planned") {
    return {
      tone: openEnded ? "open" : "planned",
      daysToEnd: end ? Math.ceil(daysBetween(today, end)) : null,
      openEnded,
      label: openEnded ? "Chưa có end" : "Lên kế hoạch",
    };
  }

  // ongoing
  if (openEnded) {
    return {
      tone: "open",
      daysToEnd: null,
      openEnded: true,
      label: "Vận hành · không end",
    };
  }
  const days = Math.ceil(daysBetween(today, end!));
  if (days < 0) {
    return {
      tone: "overdue",
      daysToEnd: days,
      openEnded: false,
      label: `Quá hạn ${Math.abs(days)} ngày`,
    };
  }
  if (days <= 30) {
    return {
      tone: "soon",
      daysToEnd: days,
      openEnded: false,
      label: days === 0 ? "Hết hạn hôm nay" : `Còn ${days} ngày`,
    };
  }
  return {
    tone: "ok",
    daysToEnd: days,
    openEnded: false,
    label: `Còn ${days} ngày`,
  };
}

function toneBarClass(tone: ProjectTimelineTone): string {
  switch (tone) {
    case "soon":
      return "bg-amber-500/85 ring-amber-500/40";
    case "overdue":
      return "bg-rose-500/90 ring-rose-500/40";
    case "open":
      return "bg-sky-500/70 ring-sky-500/30";
    case "paused":
      return "bg-muted-foreground/35 ring-border/50";
    case "done":
      return "bg-slate-400/50 ring-border/40";
    case "planned":
      return "bg-indigo-500/70 ring-indigo-500/30";
    default:
      return "bg-teal-500/80 ring-teal-500/30";
  }
}

export function ProjectPortfolioTimeline({
  projects,
}: {
  projects: Project[];
}) {
  const [range, setRange] = useState<RangeKey>("12mo");
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    return t;
  }, []);

  const { windowStart, windowEnd, months, totalDays } = useMemo(() => {
    const monthsCount = range === "6mo" ? 6 : range === "18mo" ? 18 : 12;
    // Bắt đầu từ đầu tháng hiện tại − 1 tháng (có chút quá khứ)
    const ws = startOfMonth(addMonths(today, -1));
    const we = addMonths(ws, monthsCount);
    const list: Date[] = [];
    for (let i = 0; i < monthsCount; i++) list.push(addMonths(ws, i));
    return {
      windowStart: ws,
      windowEnd: we,
      months: list,
      totalDays: Math.max(1, daysBetween(ws, we)),
    };
  }, [range, today]);

  const rows = useMemo(() => {
    const ranked = [...projects].sort((a, b) => {
      const ma = projectTimelineMeta(a, today);
      const mb = projectTimelineMeta(b, today);
      const rank = (t: ProjectTimelineTone) =>
        t === "overdue"
          ? 0
          : t === "soon"
            ? 1
            : t === "open"
              ? 2
              : t === "ok"
                ? 3
                : t === "planned"
                  ? 4
                  : 5;
      const ra = rank(ma.tone);
      const rb = rank(mb.tone);
      if (ra !== rb) return ra - rb;
      // Sắp hết hạn trước
      if (ma.daysToEnd != null && mb.daysToEnd != null) {
        return ma.daysToEnd - mb.daysToEnd;
      }
      if (ma.daysToEnd != null) return -1;
      if (mb.daysToEnd != null) return 1;
      return a.name.localeCompare(b.name, "vi");
    });

    return ranked.map((p) => {
      const meta = projectTimelineMeta(p, today);
      let start = parseDate(p.start_date) ?? parseDate(p.created_at) ?? today;
      let end = parseDate(p.end_date);

      const openEnded = !end;
      if (!end) {
        // Kéo dài hết khung nhìn + một chút
        end = new Date(windowEnd.getTime() + 14 * DAY_MS);
      }

      // Clip vào window
      const visStart = start < windowStart ? windowStart : start;
      const visEnd = end > windowEnd ? windowEnd : end;
      const leftPct = Math.max(
        0,
        Math.min(100, (daysBetween(windowStart, visStart) / totalDays) * 100)
      );
      const rightEdge = Math.max(
        0,
        Math.min(100, (daysBetween(windowStart, visEnd) / totalDays) * 100)
      );
      const widthPct = Math.max(0.8, rightEdge - leftPct);
      const clippedLeft = start < windowStart;
      const clippedRight = end > windowEnd || openEnded;

      return {
        project: p,
        meta,
        leftPct,
        widthPct,
        openEnded,
        clippedLeft,
        clippedRight,
        start,
        end: parseDate(p.end_date),
      };
    });
  }, [projects, today, windowStart, windowEnd, totalDays]);

  const todayLeft = Math.max(
    0,
    Math.min(100, (daysBetween(windowStart, today) / totalDays) * 100)
  );

  const counts = useMemo(() => {
    let soon = 0;
    let overdue = 0;
    let open = 0;
    for (const r of rows) {
      if (r.meta.tone === "soon") soon += 1;
      if (r.meta.tone === "overdue") overdue += 1;
      if (r.meta.tone === "open") open += 1;
    }
    return { soon, overdue, open };
  }, [rows]);

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl bg-card px-6 py-14 text-center text-sm text-muted-foreground ring-1 ring-border/70">
        Chưa có dự án để vẽ timeline.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <CalendarRange size={14} className="text-teal-600" />
          <span>
            {counts.overdue > 0 && (
              <span className="mr-2 text-rose-600 dark:text-rose-300">
                {counts.overdue} quá hạn
              </span>
            )}
            {counts.soon > 0 && (
              <span className="mr-2 text-amber-700 dark:text-amber-300">
                {counts.soon} sắp hết
              </span>
            )}
            {counts.open > 0 && (
              <span className="text-sky-700 dark:text-sky-300">
                {counts.open} không end
              </span>
            )}
            {counts.overdue + counts.soon + counts.open === 0 && (
              <span>Timeline ổn trong khung nhìn</span>
            )}
          </span>
        </div>
        <div className="inline-flex rounded-xl bg-muted/40 p-1 ring-1 ring-border/50">
          {(
            [
              ["6mo", "6 tháng"],
              ["12mo", "12 tháng"],
              ["18mo", "18 tháng"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              className={cn(
                "h-8 rounded-lg px-3 text-xs font-medium transition",
                range === k
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Month header */}
            <div className="flex border-b border-border/60 bg-muted/20">
              <div
                className="shrink-0 border-r border-border/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                style={{ width: LABEL_W }}
              >
                Dự án
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="flex h-9">
                  {months.map((m) => (
                    <div
                      key={m.toISOString()}
                      className="flex-1 border-l border-border/40 px-1.5 py-2 text-center text-[10px] font-medium text-muted-foreground"
                    >
                      {monthLabel(m)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <TooltipProvider delayDuration={150}>
              <div className="relative">
                {/* Today line */}
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-rose-500/80"
                  style={{
                    left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${todayLeft / 100})`,
                  }}
                >
                  <span className="absolute -top-0 left-1/2 -translate-x-1/2 rounded bg-rose-500 px-1 py-0.5 text-[9px] font-semibold text-white">
                    Hôm nay
                  </span>
                </div>

                {rows.map(
                  ({
                    project: p,
                    meta,
                    leftPct,
                    widthPct,
                    openEnded,
                    clippedLeft,
                    clippedRight,
                    start,
                    end,
                  }) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="group flex border-b border-border/40 transition hover:bg-muted/30 last:border-b-0"
                      style={{ minHeight: ROW_H }}
                    >
                      <div
                        className="flex shrink-0 items-center gap-2 border-r border-border/50 px-3"
                        style={{ width: LABEL_W }}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: p.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold leading-tight">
                            {p.name}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {STATUS_LABEL[p.status] ?? p.status}
                          </div>
                        </div>
                      </div>

                      <div className="relative min-w-0 flex-1 py-2">
                        {/* month grid lines */}
                        <div className="pointer-events-none absolute inset-0 flex">
                          {months.map((m) => (
                            <div
                              key={m.toISOString()}
                              className="flex-1 border-l border-border/30"
                            />
                          ))}
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[10px] font-medium text-white shadow-sm ring-1",
                                toneBarClass(meta.tone),
                                openEnded &&
                                  "bg-[repeating-linear-gradient(110deg,rgba(14,165,233,0.75)_0_8px,rgba(14,165,233,0.45)_8px_16px)]",
                                clippedLeft && "rounded-l-none",
                                clippedRight && openEnded && "rounded-r-none"
                              )}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                minWidth: 28,
                              }}
                            >
                              <span className="truncate drop-shadow-sm">
                                {openEnded ? (
                                  <span className="inline-flex items-center gap-1">
                                    <InfinityIcon size={10} />
                                    Vận hành
                                  </span>
                                ) : meta.tone === "soon" ||
                                  meta.tone === "overdue" ? (
                                  meta.label
                                ) : (
                                  p.name
                                )}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-[260px] text-xs"
                          >
                            <div className="font-semibold">{p.name}</div>
                            <div className="mt-1 text-muted-foreground">
                              {formatDate(start.toISOString().slice(0, 10))}
                              {" → "}
                              {end
                                ? formatDate(end.toISOString().slice(0, 10))
                                : "không end (kéo dài)"}
                            </div>
                            <div className="mt-1">{meta.label}</div>
                            {p.client && (
                              <div className="mt-0.5 text-muted-foreground">
                                {p.client}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border/50 px-4 py-2.5 text-[10px] text-muted-foreground">
          <Legend swatch="bg-teal-500/80" label="Ổn" />
          <Legend swatch="bg-amber-500/85" label="Sắp hết (≤30 ngày)" />
          <Legend swatch="bg-rose-500/90" label="Quá hạn" />
          <Legend swatch="bg-sky-500/70" label="Không có end" />
          <Legend swatch="bg-indigo-500/70" label="Lên kế hoạch" />
          <Legend swatch="bg-muted-foreground/35" label="Tạm dừng / đóng" />
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-3 rounded-sm", swatch)} />
      {label}
    </span>
  );
}

"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";
import type { Project } from "@/types/database";
import {
  CalendarRange,
  GanttChart,
  Infinity as InfinityIcon,
  List,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RangeKey = "3mo" | "6mo" | "12mo" | "18mo" | "EOY";
type Density = "compact" | "normal" | "comfy";
type ViewMode = "gantt" | "list";

const DAY_MS = 86_400_000;

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

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / DAY_MS;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
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
      return "bg-amber-500/90 ring-amber-500/35";
    case "overdue":
      return "bg-rose-500/95 ring-rose-500/40";
    case "open":
      return "bg-sky-500/80 ring-sky-500/30";
    case "paused":
      return "bg-muted-foreground/40 ring-border/50";
    case "done":
      return "bg-slate-400/55 ring-border/40";
    case "planned":
      return "bg-indigo-500/80 ring-indigo-500/30";
    default:
      return "bg-teal-500/85 ring-teal-500/30";
  }
}

function toneChipClass(tone: ProjectTimelineTone): string {
  switch (tone) {
    case "soon":
      return "bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:text-amber-200";
    case "overdue":
      return "bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-200";
    case "open":
      return "bg-sky-500/15 text-sky-800 ring-sky-500/25 dark:text-sky-200";
    case "paused":
      return "bg-muted text-muted-foreground ring-border/60";
    case "done":
      return "bg-muted text-muted-foreground ring-border/60";
    case "planned":
      return "bg-indigo-500/15 text-indigo-800 ring-indigo-500/25 dark:text-indigo-200";
    default:
      return "bg-teal-500/12 text-teal-800 ring-teal-500/25 dark:text-teal-200";
  }
}

function DaysChip({
  meta,
  compact,
}: {
  meta: ReturnType<typeof projectTimelineMeta>;
  compact?: boolean;
}) {
  if (meta.openEnded) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md font-semibold ring-1 tnum",
          toneChipClass("open"),
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
        )}
      >
        <InfinityIcon size={compact ? 10 : 12} />
        Open
      </span>
    );
  }
  if (meta.daysToEnd == null) {
    return (
      <span
        className={cn(
          "inline-flex rounded-md font-medium ring-1",
          toneChipClass(meta.tone),
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
        )}
      >
        —
      </span>
    );
  }
  const n = meta.daysToEnd;
  const text =
    n < 0 ? `−${Math.abs(n)}d` : n === 0 ? "0d" : `${n}d`;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold ring-1 tnum",
        toneChipClass(meta.tone),
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      )}
      title={meta.label}
    >
      {text}
    </span>
  );
}

export function ProjectPortfolioTimeline({
  projects,
}: {
  projects: Project[];
}) {
  const [range, setRange] = useState<RangeKey>("12mo");
  const [density, setDensity] = useState<Density>("normal");
  const [view, setView] = useState<ViewMode>("gantt");

  const today = useMemo(() => startOfDay(new Date()), []);

  const { windowStart, windowEnd, months, totalDays, startMs, endMs } =
    useMemo(() => {
      const ws = startOfMonth(today);
      let we: Date;
      if (range === "EOY") {
        we = new Date(today.getFullYear() + 1, 0, 1);
        if (daysBetween(ws, we) < 90) {
          we = addMonths(ws, 9);
        }
      } else {
        const monthsCount =
          range === "3mo"
            ? 3
            : range === "6mo"
              ? 6
              : range === "18mo"
                ? 18
                : 12;
        we = addMonths(ws, monthsCount);
      }
      // Include a little past so in-flight bars aren’t cut flush
      const past = addMonths(ws, -1);
      const list: {
        year: number;
        month: number;
        key: string;
        label: string;
        isCurrent: boolean;
        start: Date;
      }[] = [];
      const cur = new Date(past);
      while (cur < we) {
        list.push({
          year: cur.getFullYear(),
          month: cur.getMonth(),
          key: `${cur.getFullYear()}-${cur.getMonth()}`,
          label: `T${cur.getMonth() + 1}`,
          isCurrent:
            cur.getFullYear() === today.getFullYear() &&
            cur.getMonth() === today.getMonth(),
          start: new Date(cur),
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      return {
        windowStart: past,
        windowEnd: we,
        months: list,
        totalDays: Math.max(1, daysBetween(past, we)),
        startMs: past.getTime(),
        endMs: we.getTime(),
      };
    }, [range, today]);

  const sizes = {
    compact: {
      left: 220,
      daysCol: 56,
      barH: 26,
      rowH: 52,
      monthMinW: 72,
      headerH: 64,
    },
    normal: {
      left: 248,
      daysCol: 68,
      barH: 32,
      rowH: 64,
      monthMinW: 104,
      headerH: 78,
    },
    comfy: {
      left: 280,
      daysCol: 78,
      barH: 38,
      rowH: 76,
      monthMinW: 148,
      headerH: 88,
    },
  }[density];

  const dayTicks = useMemo(() => {
    const stepByDensity: Record<Density, number[]> = {
      compact: [15],
      normal: [5, 10, 15, 20, 25],
      comfy: [3, 6, 9, 12, 15, 18, 21, 24, 27],
    };
    const days = stepByDensity[density];
    const result: { date: Date; pct: number; day: number }[] = [];
    for (const m of months) {
      const dim = new Date(m.year, m.month + 1, 0).getDate();
      for (const day of days) {
        if (day > dim) continue;
        const d = new Date(m.year, m.month, day, 12);
        if (d < windowStart || d >= windowEnd) continue;
        const pct = (daysBetween(windowStart, d) / totalDays) * 100;
        result.push({ date: d, pct, day });
      }
    }
    return result;
  }, [months, density, windowStart, windowEnd, totalDays]);

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
      if (ma.daysToEnd != null && mb.daysToEnd != null) {
        return ma.daysToEnd - mb.daysToEnd;
      }
      if (ma.daysToEnd != null) return -1;
      if (mb.daysToEnd != null) return 1;
      return a.name.localeCompare(b.name, "vi");
    });

    return ranked.map((p) => {
      const meta = projectTimelineMeta(p, today);
      const start = parseDate(p.start_date) ?? parseDate(p.created_at) ?? today;
      const realEnd = parseDate(p.end_date);
      const openEnded = !realEnd;
      const end = realEnd ?? new Date(windowEnd.getTime() + 14 * DAY_MS);

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
      const widthPct = Math.max(0.6, rightEdge - leftPct);
      const clippedLeft = start < windowStart;
      const clippedRight = end > windowEnd || openEnded;

      let endMarkerPct: number | null = null;
      if (realEnd && realEnd >= windowStart && realEnd <= windowEnd) {
        endMarkerPct = Math.max(
          0,
          Math.min(100, (daysBetween(windowStart, realEnd) / totalDays) * 100)
        );
      }

      return {
        project: p,
        meta,
        leftPct,
        widthPct,
        openEnded,
        clippedLeft,
        clippedRight,
        start,
        end: realEnd,
        endMarkerPct,
      };
    });
  }, [projects, today, windowStart, windowEnd, totalDays]);

  const [todayPct, setTodayPct] = useState<number | null>(null);
  useEffect(() => {
    const t = startOfDay(new Date()).getTime();
    if (t < startMs || t > endMs) {
      setTodayPct(null);
    } else {
      setTodayPct(((t - startMs) / (endMs - startMs)) * 100);
    }
  }, [startMs, endMs]);

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

  const totalMinW =
    sizes.left + sizes.daysCol + months.length * sizes.monthMinW;

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl bg-card px-6 py-14 text-center text-sm text-muted-foreground ring-1 ring-border/70">
        Chưa có dự án để vẽ timeline.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-muted/40 p-1 ring-1 ring-border/50">
            <button
              type="button"
              onClick={() => setView("gantt")}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition",
                view === "gantt"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GanttChart size={13} />
              Gantt
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition",
                view === "list"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List size={13} />
              List
            </button>
          </div>

          {view === "gantt" && (
            <>
              <div className="inline-flex rounded-xl bg-muted/40 p-1 ring-1 ring-border/50">
                {(
                  [
                    ["3mo", "3 th"],
                    ["6mo", "6 th"],
                    ["12mo", "12 th"],
                    ["18mo", "18 th"],
                    ["EOY", "EOY"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRange(k)}
                    className={cn(
                      "h-8 rounded-lg px-2.5 text-xs font-medium transition sm:px-3",
                      range === k
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-1 rounded-xl bg-muted/40 p-1 ring-1 ring-border/50">
                <ZoomIn size={12} className="ml-1.5 text-muted-foreground" />
                {(
                  [
                    ["compact", "Gọn"],
                    ["normal", "Vừa"],
                    ["comfy", "Rộng"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDensity(k)}
                    className={cn(
                      "h-8 rounded-lg px-2.5 text-xs font-medium transition",
                      density === k
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <CalendarRange size={14} className="text-teal-600" />
          {counts.overdue > 0 && (
            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
              {counts.overdue} quá hạn
            </span>
          )}
          {counts.soon > 0 && (
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-300">
              {counts.soon} sắp hết
            </span>
          )}
          {counts.open > 0 && (
            <span className="rounded-md bg-sky-500/10 px-2 py-0.5 font-medium text-sky-800 dark:text-sky-300">
              {counts.open} open-ended
            </span>
          )}
          {counts.overdue + counts.soon + counts.open === 0 && (
            <span>Timeline ổn trong khung nhìn</span>
          )}
        </div>
      </div>

      {view === "list" ? (
        <ListView rows={rows} />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
          <div className="overflow-x-auto">
            <div style={{ minWidth: totalMinW }}>
              {/* Header */}
              <div
                className="sticky top-0 z-30 flex border-b border-border/60 bg-muted/35 backdrop-blur-sm"
                style={{ height: sizes.headerH }}
              >
                <div
                  className="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-border/50 bg-muted/50 px-3 backdrop-blur-sm"
                  style={{ width: sizes.left }}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Dự án · {rows.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70">
                    {density === "compact" && "Gọn"}
                    {density === "normal" && "Vừa"}
                    {density === "comfy" && "Rộng"} · {months.length} tháng
                  </div>
                </div>
                <div
                  className="sticky z-20 flex shrink-0 flex-col items-center justify-center border-r border-border/50 bg-muted/50 px-1 text-center backdrop-blur-sm"
                  style={{
                    left: sizes.left,
                    width: sizes.daysCol,
                  }}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Còn
                  </div>
                  <div className="text-[9px] text-muted-foreground/70">ngày</div>
                </div>
                <div className="relative min-w-0 flex-1">
                  <div className="absolute inset-0 flex">
                    {months.map((m, i) => {
                      const next =
                        months[i + 1]?.start ?? windowEnd;
                      const left =
                        (daysBetween(windowStart, m.start) / totalDays) * 100;
                      const width =
                        (daysBetween(m.start, next) / totalDays) * 100;
                      return (
                        <div
                          key={m.key}
                          className={cn(
                            "absolute top-0 bottom-0 flex flex-col items-center justify-center border-l border-border/50 text-center",
                            m.isCurrent
                              ? "bg-teal-500/[0.07] text-teal-600"
                              : "text-muted-foreground"
                          )}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <div
                            className={cn(
                              "text-sm font-semibold",
                              m.isCurrent && "text-teal-600"
                            )}
                          >
                            {m.label}
                          </div>
                          <div className="text-[10px] opacity-70">{m.year}</div>
                          {m.isCurrent && (
                            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-teal-600/80">
                              Hiện tại
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-1.5">
                    {dayTicks.map((t) => (
                      <div
                        key={t.date.getTime()}
                        className="absolute -translate-x-1/2 text-[9px] font-medium leading-none text-muted-foreground/65 tnum"
                        style={{ left: `${t.pct}%` }}
                      >
                        {t.day}
                      </div>
                    ))}
                  </div>
                  {todayPct != null && (
                    <div
                      className="pointer-events-none absolute top-1 z-20 -translate-x-1/2"
                      style={{ left: `${todayPct}%` }}
                    >
                      <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
                        Hôm nay
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <TooltipProvider delayDuration={120}>
                <div className="relative">
                  {rows.map(
                    (
                      {
                        project: p,
                        meta,
                        leftPct,
                        widthPct,
                        openEnded,
                        clippedLeft,
                        clippedRight,
                        start,
                        end,
                        endMarkerPct,
                      },
                      idx
                    ) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="group flex border-b border-border/40 transition hover:bg-muted/25 last:border-b-0"
                        style={{
                          minHeight: sizes.rowH,
                          animationDelay: `${idx * 18}ms`,
                        }}
                      >
                        <div
                          className="sticky left-0 z-10 flex shrink-0 items-center gap-2.5 border-r border-border/50 bg-card/95 px-3 backdrop-blur-sm"
                          style={{ width: sizes.left }}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
                            style={{ background: p.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold leading-tight">
                              {p.name}
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {STATUS_LABEL[p.status] ?? p.status}
                              {p.client ? ` · ${p.client}` : ""}
                            </div>
                          </div>
                        </div>

                        <div
                          className="sticky z-10 flex shrink-0 items-center justify-center border-r border-border/50 bg-card/95 backdrop-blur-sm"
                          style={{
                            left: sizes.left,
                            width: sizes.daysCol,
                          }}
                        >
                          <DaysChip meta={meta} compact={density === "compact"} />
                        </div>

                        <div
                          className="relative min-w-0 flex-1"
                          style={{ minHeight: sizes.rowH }}
                        >
                          {months.map((m, i) => {
                            const next = months[i + 1]?.start ?? windowEnd;
                            return (
                              <div
                                key={m.key}
                                className={cn(
                                  "pointer-events-none absolute top-0 bottom-0 border-l border-border/40",
                                  m.isCurrent && "bg-teal-500/[0.04]"
                                )}
                                style={{
                                  left: `${(daysBetween(windowStart, m.start) / totalDays) * 100}%`,
                                  width: `${(daysBetween(m.start, next) / totalDays) * 100}%`,
                                }}
                              />
                            );
                          })}

                          {dayTicks.map((t) => (
                            <div
                              key={`tick-${t.date.getTime()}`}
                              className="pointer-events-none absolute top-0 bottom-0 w-px bg-border/25"
                              style={{ left: `${t.pct}%` }}
                            />
                          ))}

                          {todayPct != null && (
                            <div
                              className="pointer-events-none absolute top-0 bottom-0 z-10"
                              style={{ left: `${todayPct}%` }}
                            >
                              <div
                                className="h-full w-0.5"
                                style={{
                                  background:
                                    "linear-gradient(to bottom, #f43f5e, #be123c)",
                                  boxShadow: "0 0 8px rgb(244 63 94 / 0.45)",
                                }}
                              />
                            </div>
                          )}

                          {endMarkerPct != null && (
                            <div
                              className="pointer-events-none absolute top-2 bottom-2 z-[5] w-px bg-foreground/35"
                              style={{ left: `${endMarkerPct}%` }}
                              title="Ngày kết thúc"
                            />
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-1/2 z-[6] flex -translate-y-1/2 items-center overflow-hidden rounded-lg px-2.5 text-[11px] font-semibold text-white shadow-sm ring-1",
                                  toneBarClass(meta.tone),
                                  openEnded &&
                                    "bg-[repeating-linear-gradient(110deg,rgba(14,165,233,0.85)_0_10px,rgba(14,165,233,0.5)_10px_20px)]",
                                  clippedLeft && "rounded-l-none",
                                  clippedRight && openEnded && "rounded-r-none"
                                )}
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  height: sizes.barH,
                                  minWidth: 36,
                                }}
                              >
                                <span className="truncate drop-shadow-sm">
                                  {openEnded ? (
                                    <span className="inline-flex items-center gap-1">
                                      <InfinityIcon size={11} />
                                      Open-ended
                                    </span>
                                  ) : density === "comfy" ||
                                    widthPct > 12 ? (
                                    p.name
                                  ) : (
                                    ""
                                  )}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[280px] text-xs"
                            >
                              <div className="font-semibold">{p.name}</div>
                              <div className="mt-1 text-muted-foreground">
                                {formatDate(start.toISOString().slice(0, 10))}
                                {" → "}
                                {end
                                  ? formatDate(end.toISOString().slice(0, 10))
                                  : "không end"}
                              </div>
                              <div className="mt-1 font-medium">{meta.label}</div>
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
            <Legend swatch="bg-teal-500/85" label="Ổn" />
            <Legend swatch="bg-amber-500/90" label="Sắp hết (≤30d)" />
            <Legend swatch="bg-rose-500/95" label="Quá hạn" />
            <Legend swatch="bg-sky-500/80" label="Không end" />
            <Legend swatch="bg-indigo-500/80" label="Lên kế hoạch" />
            <Legend swatch="bg-muted-foreground/40" label="Tạm dừng / đóng" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-px bg-foreground/40" />
              Mốc end
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ListView({
  rows,
}: {
  rows: {
    project: Project;
    meta: ReturnType<typeof projectTimelineMeta>;
    start: Date;
    end: Date | null;
    openEnded: boolean;
  }[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_100px_120px_120px_140px] gap-3 border-b border-border/60 bg-muted/25 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:grid">
        <div>Dự án</div>
        <div>Trạng thái</div>
        <div>Start</div>
        <div>End</div>
        <div className="text-right">Còn lại</div>
      </div>
      <div className="divide-y divide-border/40">
        {rows.map(({ project: p, meta, start, end, openEnded }) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="grid grid-cols-1 gap-2 px-4 py-3 transition hover:bg-muted/25 sm:grid-cols-[minmax(0,1.4fr)_100px_120px_120px_140px] sm:items-center sm:gap-3"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                {p.client && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {p.client}
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {STATUS_LABEL[p.status] ?? p.status}
            </div>
            <div className="text-xs tnum text-muted-foreground">
              {formatDate(start.toISOString().slice(0, 10))}
            </div>
            <div className="text-xs tnum text-muted-foreground">
              {end ? (
                formatDate(end.toISOString().slice(0, 10))
              ) : (
                <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300">
                  <InfinityIcon size={11} /> Open
                </span>
              )}
            </div>
            <div className="flex sm:justify-end">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1",
                  toneChipClass(meta.tone)
                )}
              >
                {openEnded
                  ? "Không end"
                  : meta.daysToEnd == null
                    ? "—"
                    : meta.label}
              </span>
            </div>
          </Link>
        ))}
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

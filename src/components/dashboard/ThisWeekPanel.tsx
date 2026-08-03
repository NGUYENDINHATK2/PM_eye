"use client";

import type { AppAlert } from "@/lib/alerts";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Flame } from "lucide-react";
import Link from "next/link";

/** Top việc cần xử lý tuần này — critical/warn trước, có CTA. */
export function ThisWeekPanel({ alerts }: { alerts: AppAlert[] }) {
  const action = alerts
    .filter((a) => a.severity === "critical" || a.severity === "warn")
    .slice(0, 8);

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-border/70">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight">
            Tuần này cần xử lý
          </h2>
          <p className="text-xs text-muted-foreground">
            {action.length > 0
              ? `${action.length} việc ưu tiên`
              : "Không có cảnh báo nóng"}
          </p>
        </div>
        <Flame
          size={16}
          className={
            action.some((a) => a.severity === "critical")
              ? "text-rose-500"
              : "text-muted-foreground"
          }
        />
      </div>

      {action.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-4 text-sm text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
          <CheckCircle2 size={16} />
          Team đang ổn — không có việc critical/warn.
        </div>
      ) : (
        <ul className="space-y-2">
          {action.map((a) => (
            <li key={a.id}>
              <Link
                href={a.href || "/"}
                className={cn(
                  "group flex items-start gap-3 rounded-xl px-3 py-2.5 ring-1 transition",
                  "hover:bg-muted/50",
                  a.severity === "critical"
                    ? "bg-rose-500/[0.06] ring-rose-500/20"
                    : "bg-amber-500/[0.06] ring-amber-500/20"
                )}
              >
                <AlertTriangle
                  size={14}
                  className={cn(
                    "mt-0.5 shrink-0",
                    a.severity === "critical" ? "text-rose-500" : "text-amber-500"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.title}</div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {a.detail}
                  </div>
                </div>
                <ArrowUpRight
                  size={12}
                  className="mt-1 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

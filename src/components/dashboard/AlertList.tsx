"use client";

import type { AppAlert } from "@/lib/alerts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarClock,
  CheckCircle2,
  Flame,
  Sparkles,
  UserX,
  Wallet,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

/** @deprecated — dùng AppAlert từ @/lib/alerts */
export type Alert = AppAlert;

const kindStyle: Record<
  AppAlert["kind"],
  { icon: ReactNode; bg: string; text: string; ring: string }
> = {
  burnout: {
    icon: <Flame size={13} strokeWidth={2.3} />,
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/20",
  },
  idle: {
    icon: <Sparkles size={13} strokeWidth={2.3} />,
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/20",
  },
  budget: {
    icon: <Wallet size={13} strokeWidth={2.3} />,
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
  },
  "missing-role": {
    icon: <UserX size={13} strokeWidth={2.3} />,
    bg: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
    ring: "ring-cyan-500/20",
  },
  deadline: {
    icon: <CalendarClock size={13} strokeWidth={2.3} />,
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
  hygiene: {
    icon: <Wrench size={13} strokeWidth={2.3} />,
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-300",
    ring: "ring-slate-500/20",
  },
};

export function AlertList({ alerts }: { alerts: AppAlert[] }) {
  const hasAlerts = alerts.length > 0;
  const critical = alerts.filter((a) => a.severity === "critical").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <span
            className={
              critical > 0
                ? "status-dot status-dot-rose"
                : hasAlerts
                ? "status-dot status-dot-amber"
                : "status-dot"
            }
          />
          Cảnh báo
        </CardTitle>
        <CardDescription>
          {hasAlerts
            ? `${alerts.length} điểm · ${critical} critical`
            : "Không có vấn đề nào"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAlerts && (
          <div className="text-center py-8">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mb-3">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <div className="text-sm font-medium">Tất cả ổn áp</div>
            <div className="text-xs text-muted-foreground mt-1">
              Team đang vận hành trong vùng an toàn.
            </div>
          </div>
        )}
        <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar">
          {alerts.slice(0, 12).map((a) => {
            const s = kindStyle[a.kind];
            const inner = (
              <>
                <div
                  className={`w-7 h-7 rounded-lg ${s.bg} ${s.text} ring-1 ${s.ring} flex items-center justify-center shrink-0`}
                >
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {a.detail}
                  </div>
                </div>
              </>
            );
            const cls =
              "flex items-start gap-2.5 p-2.5 rounded-xl border bg-card/50 hover:border-primary/25 transition";
            return a.href ? (
              <Link key={a.id} href={a.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={a.id} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
        {alerts.length > 12 && (
          <Link
            href="/insights"
            className="block text-center text-xs text-primary mt-3 hover:underline"
          >
            Xem toàn bộ trên Insights →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

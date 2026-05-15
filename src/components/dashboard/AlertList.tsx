"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Flame, UserX, Wallet, Sparkles, CheckCircle2 } from "lucide-react";
import { ReactNode } from "react";

export type Alert = {
  id: string;
  kind: "burnout" | "idle" | "budget" | "missing-role";
  title: string;
  detail: string;
};

const kindStyle: Record<
  Alert["kind"],
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
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
};

export function AlertList({ alerts }: { alerts: Alert[] }) {
  const hasAlerts = alerts.length > 0;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <span
            className={
              hasAlerts ? "status-dot status-dot-amber" : "status-dot"
            }
          />
          Cảnh báo
        </CardTitle>
        <CardDescription>
          {hasAlerts
            ? `${alerts.length} điểm cần để ý`
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
        <div className="space-y-1 max-h-80 overflow-auto no-scrollbar -mx-1 px-1">
          {alerts.map((a, i) => {
            const s = kindStyle[a.kind];
            return (
              <div
                key={a.id}
                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className={`w-7 h-7 rounded-md ${s.bg} ${s.text} ring-1 ${s.ring} flex items-center justify-center shrink-0`}
                >
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {a.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

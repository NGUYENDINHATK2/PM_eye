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
  { icon: ReactNode; code: string; bg: string; text: string; ring: string }
> = {
  burnout: {
    icon: <Flame size={13} strokeWidth={2.3} />,
    code: "BRN",
    bg: "bg-neon-rose/10",
    text: "text-neon-rose",
    ring: "ring-neon-rose/30",
  },
  idle: {
    icon: <Sparkles size={13} strokeWidth={2.3} />,
    code: "IDL",
    bg: "bg-neon-cyan/10",
    text: "text-neon-cyan",
    ring: "ring-neon-cyan/30",
  },
  budget: {
    icon: <Wallet size={13} strokeWidth={2.3} />,
    code: "BGT",
    bg: "bg-neon-amber/10",
    text: "text-neon-amber",
    ring: "ring-neon-amber/30",
  },
  "missing-role": {
    icon: <UserX size={13} strokeWidth={2.3} />,
    code: "GAP",
    bg: "bg-neon-violet/10",
    text: "text-neon-violet",
    ring: "ring-neon-violet/30",
  },
};

export function AlertList({ alerts }: { alerts: Alert[] }) {
  const hasAlerts = alerts.length > 0;
  return (
    <Card hud>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <span className={hasAlerts ? "status-dot status-dot-rose" : "status-dot"} />
            Cảnh báo
          </CardTitle>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-neon-cyan/70">
            // SYS.ALERT · {alerts.length.toString().padStart(2, "0")}
          </span>
        </div>
        <CardDescription className="font-mono text-[11px] tracking-wider uppercase">
          {hasAlerts ? `${alerts.length} điểm cần để ý` : "ALL CLEAR"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAlerts && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-neon-lime/10 ring-1 ring-neon-lime/40 flex items-center justify-center mb-3 glow-lime">
              <CheckCircle2 size={20} className="text-neon-lime" />
            </div>
            <div className="font-display text-sm font-semibold">Tất cả ổn áp</div>
            <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mt-1">
              NEURAL · NOMINAL
            </div>
          </div>
        )}
        <div className="space-y-1 max-h-80 overflow-auto no-scrollbar -mx-1 px-1">
          {alerts.map((a, i) => {
            const s = kindStyle[a.kind];
            return (
              <div
                key={a.id}
                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-card/40 hover:ring-1 hover:ring-neon-cyan/20 transition animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className={`w-8 h-8 rounded-lg ${s.bg} ${s.text} ring-1 ${s.ring} flex items-center justify-center shrink-0`}
                >
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium leading-snug truncate">{a.title}</div>
                    <span className={`font-mono text-[9px] tracking-wider shrink-0 ${s.text} opacity-80`}>
                      {s.code}
                    </span>
                  </div>
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

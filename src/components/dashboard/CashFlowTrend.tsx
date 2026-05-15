"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { periodCostTimeline } from "@/lib/calculations";
import { cn, formatCurrency, monthKey } from "@/lib/utils";
import type {
  Allocation,
  OperatingExpense,
  Profile,
  ProjectPayment,
  SalaryHistory,
} from "@/types/database";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Granularity = "month" | "week";

export function CashFlowTrend({
  allocations,
  profilesById,
  expenses,
  payments,
  salaryHistory,
}: {
  allocations: Allocation[];
  profilesById: Map<string, Profile>;
  expenses: OperatingExpense[];
  payments: ProjectPayment[];
  salaryHistory: SalaryHistory[];
}) {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [count, setCount] = useState<number>(6);

  const data = useMemo(() => {
    const costs = periodCostTimeline(
      granularity,
      count,
      allocations,
      profilesById,
      expenses,
      salaryHistory
    );
    // Group payments paid by period
    return costs.map((c) => {
      let cashIn = 0;
      for (const p of payments) {
        if (p.status !== "paid" || !p.paid_date) continue;
        const d = new Date(p.paid_date);
        if (d >= c.start && d <= c.end) cashIn += Number(p.amount);
      }
      return {
        ...c,
        cashIn,
        cashOut: c.total,
        net: cashIn - c.total,
      };
    });
  }, [granularity, count, allocations, profilesById, expenses, payments, salaryHistory]);

  const totalIn = data.reduce((s, d) => s + d.cashIn, 0);
  const totalOut = data.reduce((s, d) => s + d.cashOut, 0);
  const totalNet = totalIn - totalOut;
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const netDelta =
    last && prev && prev.net !== 0 ? ((last.net - prev.net) / Math.abs(prev.net)) * 100 : null;

  return (
    <Card hud>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-neon-cyan/80 mb-1 flex items-center gap-2">
              <span className="status-dot" />
              // FIN.CASHFLOW
            </div>
            <CardTitle className="font-display text-base">Dòng tiền · Cash flow</CardTitle>
            <CardDescription>
              Tiền vào (đã thu) vs Tiền ra (chi phí) — {data.length}{" "}
              {granularity === "month" ? "tháng" : "tuần"} gần nhất
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-neon-cyan/20 bg-card/40 backdrop-blur p-1">
              {(["month", "week"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGranularity(g);
                    setCount(g === "month" ? 6 : 8);
                  }}
                  className={cn(
                    "px-3 h-7 rounded-md text-[11px] font-mono uppercase tracking-wider transition",
                    granularity === g
                      ? "text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  style={
                    granularity === g
                      ? {
                          background:
                            "linear-gradient(135deg, hsl(var(--neon-violet)), hsl(var(--neon-cyan)))",
                          boxShadow:
                            "0 0 12px -2px hsl(var(--neon-cyan) / 0.5)",
                        }
                      : undefined
                  }
                >
                  {g === "month" ? "Tháng" : "Tuần"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-3 pt-3">
          <div className="rounded-lg bg-neon-lime/5 border border-neon-lime/20 px-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-neon-lime/90">
              IN · TIỀN VÀO
            </div>
            <div className="font-mono text-base font-semibold tnum mt-0.5 text-neon-lime">
              {formatCurrency(totalIn)}
            </div>
          </div>
          <div className="rounded-lg bg-neon-rose/5 border border-neon-rose/20 px-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-neon-rose/90">
              OUT · TIỀN RA
            </div>
            <div className="font-mono text-base font-semibold tnum mt-0.5 text-neon-rose">
              {formatCurrency(totalOut)}
            </div>
          </div>
          <div
            className={cn(
              "rounded-lg border px-3 py-2",
              totalNet >= 0
                ? "bg-neon-cyan/5 border-neon-cyan/20"
                : "bg-neon-amber/5 border-neon-amber/20"
            )}
          >
            <div
              className={cn(
                "text-[10px] font-mono uppercase tracking-[0.16em]",
                totalNet >= 0 ? "text-neon-cyan/90" : "text-neon-amber/90"
              )}
            >
              {totalNet >= 0 ? "NET · THẶNG DƯ" : "NET · ÂM DÒNG"}
            </div>
            <div
              className={cn(
                "font-mono text-base font-semibold tnum mt-0.5 flex items-center gap-1.5",
                totalNet >= 0 ? "gradient-text-indigo" : "text-neon-amber"
              )}
            >
              {formatCurrency(totalNet)}
              {netDelta !== null && (
                <span
                  className={cn(
                    "text-[10px] inline-flex items-center gap-0.5 px-1 rounded",
                    netDelta > 5
                      ? "text-emerald-500 bg-emerald-500/10"
                      : netDelta < -5
                      ? "text-rose-500 bg-rose-500/10"
                      : "text-muted-foreground bg-muted"
                  )}
                >
                  {netDelta > 5 ? (
                    <ArrowUp size={10} />
                  ) : netDelta < -5 ? (
                    <ArrowDown size={10} />
                  ) : (
                    <Minus size={10} />
                  )}
                  {Math.abs(netDelta).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-72 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cf-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--neon-lime))" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="hsl(var(--neon-lime))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cf-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--neon-rose))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--neon-rose))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="short"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1_000
                    ? `${(v / 1_000).toFixed(0)}k`
                    : v
                }
              />
              <Tooltip
                cursor={{
                  stroke: "hsl(var(--muted-foreground))",
                  strokeDasharray: "3 3",
                  strokeOpacity: 0.4,
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof data)[0];
                  return (
                    <div className="rounded-lg border border-neon-cyan/30 bg-popover/95 backdrop-blur-md px-3 py-2.5 shadow-[0_0_24px_-4px_hsl(var(--neon-cyan)/0.3)] text-xs min-w-[210px]">
                      <div className="font-display font-semibold mb-1.5">{d.label}</div>
                      <div className="space-y-0.5 font-mono">
                        <div className="flex justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-neon-lime shadow-[0_0_6px_hsl(var(--neon-lime))]" />
                            IN
                          </span>
                          <span className="tnum text-neon-lime">
                            {formatCurrency(d.cashIn)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-neon-rose shadow-[0_0_6px_hsl(var(--neon-rose))]" />
                            OUT
                          </span>
                          <span className="tnum text-neon-rose">
                            {formatCurrency(d.cashOut)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 pt-1 mt-1 border-t border-neon-cyan/20">
                          <span className="uppercase tracking-wider">NET</span>
                          <span
                            className={cn(
                              "tnum font-semibold",
                              d.net >= 0 ? "text-neon-cyan" : "text-neon-amber"
                            )}
                          >
                            {d.net >= 0 ? "+" : ""}
                            {formatCurrency(d.net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="cashIn"
                stroke="hsl(var(--neon-lime))"
                strokeWidth={2.5}
                fill="url(#cf-in)"
                name="Tiền vào"
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="cashOut"
                stroke="hsl(var(--neon-rose))"
                strokeWidth={2.5}
                fill="url(#cf-out)"
                name="Tiền ra"
                animationDuration={900}
              />
              <Legend
                verticalAlign="bottom"
                height={20}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// re-export monthKey to silence unused import warning if needed elsewhere
void monthKey;

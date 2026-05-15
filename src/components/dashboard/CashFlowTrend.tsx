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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">Dòng tiền · Cash flow</CardTitle>
            <CardDescription>
              Tiền vào (đã thu) vs Tiền ra (chi phí) — {data.length}{" "}
              {granularity === "month" ? "tháng" : "tuần"} gần nhất
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
              {(["month", "week"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGranularity(g);
                    setCount(g === "month" ? 6 : 8);
                  }}
                  className={cn(
                    "px-3 h-7 rounded-md text-xs font-medium transition",
                    granularity === g
                      ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g === "month" ? "Tháng" : "Tuần"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-3 pt-3">
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              💚 Tiền vào
            </div>
            <div className="text-base font-semibold tnum mt-0.5 text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalIn)}
            </div>
          </div>
          <div className="rounded-lg bg-rose-500/5 border border-rose-500/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              💸 Tiền ra
            </div>
            <div className="text-base font-semibold tnum mt-0.5 text-rose-600 dark:text-rose-400">
              {formatCurrency(totalOut)}
            </div>
          </div>
          <div
            className={cn(
              "rounded-lg border px-3 py-2",
              totalNet >= 0
                ? "bg-indigo-500/5 border-indigo-500/10"
                : "bg-amber-500/5 border-amber-500/10"
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {totalNet >= 0 ? "✨ Thặng dư" : "⚠ Âm dòng"}
            </div>
            <div
              className={cn(
                "text-base font-semibold tnum mt-0.5 flex items-center gap-1.5",
                totalNet >= 0
                  ? "gradient-text-indigo"
                  : "text-amber-600 dark:text-amber-400"
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
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cf-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
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
                    <div className="rounded-lg border bg-popover px-3 py-2.5 shadow-md text-xs min-w-[200px]">
                      <div className="font-semibold mb-1.5">{d.label}</div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Tiền vào
                          </span>
                          <span className="tnum text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(d.cashIn)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Tiền ra
                          </span>
                          <span className="tnum text-rose-600 dark:text-rose-400">
                            {formatCurrency(d.cashOut)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 pt-1 mt-1 border-t">
                          <span>Net</span>
                          <span
                            className={cn(
                              "tnum font-semibold",
                              d.net >= 0
                                ? "text-indigo-500"
                                : "text-amber-500"
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
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#cf-in)"
                name="Tiền vào"
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="cashOut"
                stroke="#f43f5e"
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

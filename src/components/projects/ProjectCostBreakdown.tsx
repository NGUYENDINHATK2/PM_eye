"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { periodCostTimeline, type PeriodCost } from "@/lib/calculations";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  Allocation,
  OperatingExpense,
  Profile,
  SalaryHistory,
} from "@/types/database";
import { ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Granularity = "month" | "week";

export function ProjectCostBreakdown({
  projectId,
  allocations,
  profilesById,
  expenses,
  salaryHistory,
}: {
  projectId: string;
  allocations: Allocation[];
  profilesById: Map<string, Profile>;
  expenses: OperatingExpense[];
  salaryHistory: SalaryHistory[];
}) {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [count, setCount] = useState<number>(6);

  const periods: PeriodCost[] = useMemo(
    () =>
      periodCostTimeline(
        granularity,
        count,
        allocations,
        profilesById,
        expenses,
        salaryHistory,
        projectId
      ),
    [granularity, count, allocations, profilesById, expenses, salaryHistory, projectId]
  );

  const total = periods.reduce((s, p) => s + p.total, 0);
  const avg = periods.length > 0 ? total / periods.length : 0;
  const last = periods[periods.length - 1];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-500" />
              Chi phí vận hành theo {granularity === "month" ? "tháng" : "tuần"}
            </CardTitle>
            <CardDescription>
              Lương phân bổ (theo lịch sử) + chi phí ngoài lương · Δ so với kỳ
              trước
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
            <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
              {(granularity === "month" ? [3, 6, 12] : [4, 8, 12]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={cn(
                    "px-2.5 h-7 rounded-md text-xs font-medium transition",
                    count === n
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 pt-3">
          <SummaryCell
            label={`Tổng ${count} ${granularity === "month" ? "tháng" : "tuần"}`}
            value={formatCurrency(total)}
            tone="default"
          />
          <SummaryCell
            label={`TB / ${granularity === "month" ? "tháng" : "tuần"}`}
            value={formatCurrency(avg)}
            tone="indigo"
          />
          <SummaryCell
            label={`Kỳ gần nhất`}
            value={last ? formatCurrency(last.total) : "—"}
            tone={
              last && last.deltaTotal > 0
                ? "danger"
                : last && last.deltaTotal < 0
                ? "success"
                : "default"
            }
            delta={
              last
                ? {
                    value: last.deltaTotal,
                    pct: last.deltaPct,
                  }
                : undefined
            }
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Bar chart */}
        <div className="h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={periods}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
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
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as PeriodCost;
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2.5 shadow-md text-xs min-w-[200px]">
                      <div className="font-semibold mb-1.5">{p.label}</div>
                      <div className="space-y-0.5">
                        <Row label="Lương" value={p.labor} color="hsl(var(--indigo))" />
                        <Row label="Vận hành" value={p.ops} color="hsl(var(--sky))" />
                        <div className="flex justify-between pt-1 mt-1 border-t">
                          <span>Tổng</span>
                          <span className="tnum font-semibold">
                            {formatCurrency(p.total)}
                          </span>
                        </div>
                        {p.deltaPct !== null && (
                          <div
                            className={cn(
                              "flex justify-between text-[10px]",
                              p.deltaTotal > 0
                                ? "text-rose-500"
                                : p.deltaTotal < 0
                                ? "text-emerald-500"
                                : "text-muted-foreground"
                            )}
                          >
                            <span>So kỳ trước</span>
                            <span className="tnum">
                              {p.deltaTotal > 0 ? "+" : ""}
                              {formatCurrency(p.deltaTotal)} (
                              {p.deltaPct > 0 ? "+" : ""}
                              {p.deltaPct.toFixed(0)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="labor"
                stackId="a"
                fill="hsl(var(--indigo))"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="ops"
                stackId="a"
                fill="hsl(var(--sky))"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1 mb-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--indigo))" }} />
            Lương
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--sky))" }} />
            Vận hành
          </span>
        </div>

        {/* Table view — clear period-by-period breakdown */}
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-3 py-2.5">
                  Kỳ
                </th>
                <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-3 py-2.5">
                  Lương
                </th>
                <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-3 py-2.5">
                  Vận hành
                </th>
                <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-3 py-2.5">
                  Tổng
                </th>
                <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-3 py-2.5">
                  Δ vs kỳ trước
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    Chưa có dữ liệu chi phí trong khoảng này.
                  </td>
                </tr>
              )}
              {periods.map((p, idx) => {
                const isLast = idx === periods.length - 1;
                return (
                  <tr
                    key={p.key}
                    className={cn(
                      "border-t",
                      isLast && "bg-indigo-500/[0.04] font-medium"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="text-sm">{p.label}</div>
                      {isLast && (
                        <div className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider">
                          Hiện tại
                        </div>
                      )}
                    </td>
                    <td className="text-right tnum text-indigo-600 dark:text-indigo-400 px-3 py-2.5">
                      {p.labor > 0 ? formatCurrency(p.labor) : "—"}
                    </td>
                    <td className="text-right tnum text-sky-600 dark:text-sky-400 px-3 py-2.5">
                      {p.ops > 0 ? formatCurrency(p.ops) : "—"}
                    </td>
                    <td className="text-right tnum font-semibold px-3 py-2.5">
                      {formatCurrency(p.total)}
                    </td>
                    <td className="text-right px-3 py-2.5">
                      <DeltaCell value={p.deltaTotal} pct={p.deltaPct} first={idx === 0} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tnum">{formatCurrency(value)}</span>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone,
  delta,
}: {
  label: string;
  value: string;
  tone: "default" | "indigo" | "success" | "danger";
  delta?: { value: number; pct: number | null };
}) {
  const toneCls =
    tone === "indigo"
      ? "gradient-text-indigo"
      : tone === "success"
      ? "text-emerald-500"
      : tone === "danger"
      ? "text-rose-500"
      : "text-foreground";
  return (
    <div className="rounded-lg border bg-card/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className={cn("text-base font-semibold tnum mt-0.5", toneCls)}>
        {value}
      </div>
      {delta && delta.pct !== null && (
        <div
          className={cn(
            "text-[10px] tnum mt-0.5 flex items-center gap-1",
            delta.value > 0
              ? "text-rose-500"
              : delta.value < 0
              ? "text-emerald-500"
              : "text-muted-foreground"
          )}
        >
          {delta.value > 0 ? (
            <ArrowUp size={10} />
          ) : delta.value < 0 ? (
            <ArrowDown size={10} />
          ) : (
            <Minus size={10} />
          )}
          {delta.pct > 0 ? "+" : ""}
          {delta.pct.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

function DeltaCell({
  value,
  pct,
  first,
}: {
  value: number;
  pct: number | null;
  first: boolean;
}) {
  if (first) {
    return <span className="text-[11px] text-muted-foreground italic">—</span>;
  }
  if (pct === null) {
    return value === 0 ? (
      <span className="text-[11px] text-muted-foreground italic">—</span>
    ) : (
      <span className="text-[11px] text-emerald-500 tnum">+{formatCurrency(value)}</span>
    );
  }
  const tone =
    value > 0
      ? "text-rose-500 bg-rose-500/10 ring-rose-500/20"
      : value < 0
      ? "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20"
      : "text-muted-foreground bg-muted ring-border";
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ring-1 tnum",
        tone
      )}
    >
      <Icon size={10} />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(0)}%
      <span className="opacity-70 ml-0.5">
        ({value > 0 ? "+" : ""}
        {formatCurrency(value)})
      </span>
    </span>
  );
}

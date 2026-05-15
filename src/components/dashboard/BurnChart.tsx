"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { MonthBucket } from "@/lib/calculations";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export function BurnChart({ data }: { data: MonthBucket[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const avg = data.length > 0 ? total / data.length : 0;
  const last = data[data.length - 1]?.total ?? 0;
  const prev = data[data.length - 2]?.total ?? 0;
  const trend = prev > 0 ? ((last - prev) / prev) * 100 : 0;

  const TrendIcon = trend > 5 ? TrendingUp : trend < -5 ? TrendingDown : Minus;
  const trendColor =
    trend > 5
      ? "text-rose-500 bg-rose-500/10"
      : trend < -5
      ? "text-emerald-500 bg-emerald-500/10"
      : "text-muted-foreground bg-muted";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Burn rate</CardTitle>
          <CardDescription className="mt-0.5">
            Lương phân bổ + chi phí vận hành (6 tháng)
          </CardDescription>
          <div className="text-2xl font-semibold tracking-tight mt-3 tnum">
            {formatCurrency(avg)}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              / tháng TB
            </span>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${trendColor}`}
        >
          <TrendIcon size={12} />
          {Math.abs(trend).toFixed(0)}%
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="lab" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--indigo))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--indigo))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ops" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--sky))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--sky))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="label"
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
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                  strokeOpacity: 0.5,
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const labor =
                    (payload.find((p) => p.dataKey === "labor")?.value as number) ?? 0;
                  const ops =
                    (payload.find((p) => p.dataKey === "ops")?.value as number) ?? 0;
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2.5 shadow-md text-xs">
                      <div className="font-semibold mb-1.5">{label}</div>
                      <div className="space-y-1 min-w-[140px]">
                        <div className="flex items-center gap-3 justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: "hsl(var(--indigo))" }}
                            />
                            Lương
                          </span>
                          <span className="tnum font-medium">{formatCurrency(labor)}</span>
                        </div>
                        <div className="flex items-center gap-3 justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: "hsl(var(--sky))" }}
                            />
                            Vận hành
                          </span>
                          <span className="tnum font-medium">{formatCurrency(ops)}</span>
                        </div>
                        <div className="flex items-center gap-3 justify-between pt-1 border-t">
                          <span>Tổng</span>
                          <span className="tnum font-semibold">{formatCurrency(labor + ops)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="labor"
                stackId="1"
                stroke="hsl(var(--indigo))"
                strokeWidth={2}
                fill="url(#lab)"
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="ops"
                stackId="1"
                stroke="hsl(var(--sky))"
                strokeWidth={2}
                fill="url(#ops)"
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "hsl(var(--indigo))" }}
            />
            Lương phân bổ
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "hsl(var(--sky))" }}
            />
            Chi phí vận hành
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

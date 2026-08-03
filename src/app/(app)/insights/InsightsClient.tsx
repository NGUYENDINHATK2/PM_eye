"use client";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildAppAlerts, type AppAlert } from "@/lib/alerts";
import {
  loadStatus,
  loadStatusLabel,
  monthlyCostTimeline,
  paymentSummary,
  userLoadToday,
  userPeakLoad,
  type ProjectFinance,
} from "@/lib/calculations";
import { downloadCsv } from "@/lib/export-csv";
import type { AppData } from "@/lib/hooks/useAppData";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  Flame,
  LineChart,
  PiggyBank,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
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

type SortKey = "margin" | "profit" | "spent" | "utilization" | "name";

const SEV: Record<AppAlert["severity"], string> = {
  critical: "border-rose-500/30 bg-rose-500/[0.06]",
  warn: "border-amber-500/30 bg-amber-500/[0.06]",
  info: "border-sky-500/25 bg-sky-500/[0.05]",
};

export function InsightsClient({ data }: { data: AppData }) {
  const {
    profiles,
    projects,
    phases,
    allocations,
    expenses,
    payments,
    salaryHistory,
  } = data;

  const [sort, setSort] = useState<SortKey>("margin");
  const [statusFilter, setStatusFilter] = useState<string>("ongoing");

  const computed = useMemo(() => {
    const today = new Date();
    const { alerts, finances } = buildAppAlerts({
      profiles,
      projects,
      phases,
      allocations,
      expenses,
      payments,
      salaryHistory,
      asOf: today,
    });

    const profilesById = new Map(profiles.map((p) => [p.id, p]));
    const ar = paymentSummary(payments, today);
    const timeline = monthlyCostTimeline(
      allocations,
      profilesById,
      expenses,
      6,
      undefined,
      salaryHistory
    );

    const withRev = finances.filter((f) => f.finance.hasRevenue);
    const totalRevenue = withRev.reduce((s, f) => s + f.finance.revenue, 0);
    const totalProfit = withRev.reduce((s, f) => s + f.finance.profit, 0);
    const totalSpent = finances.reduce((s, f) => s + f.finance.totalSpent, 0);
    const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
    const burnThisMonth = timeline[timeline.length - 1]?.total ?? 0;

    const peakEnd = new Date(today);
    peakEnd.setDate(peakEnd.getDate() + 30);
    const overload = profiles
      .filter((p) => p.is_active)
      .map((p) => {
        const now = userLoadToday(p.id, allocations, today);
        const peak = userPeakLoad(p.id, allocations, today, peakEnd);
        return {
          profile: p,
          now,
          peak: peak?.load ?? now,
          status: loadStatus(Math.max(now, peak?.load ?? 0)),
        };
      })
      .filter((x) => x.now > 1 || x.peak > 1)
      .sort((a, b) => b.peak - a.peak);

    const arByProject = projects
      .map((p) => {
        const ps = paymentSummary(
          payments.filter((x) => x.project_id === p.id),
          today
        );
        return { project: p, ...ps };
      })
      .filter(
        (x) =>
          x.totalOverdue > 0 ||
          x.totalInvoiced > 0 ||
          x.totalPlanned > 0
      )
      .sort(
        (a, b) =>
          b.totalOverdue - a.totalOverdue ||
          b.totalInvoiced - a.totalInvoiced
      );

    return {
      alerts,
      finances,
      ar,
      timeline,
      totalRevenue,
      totalProfit,
      totalSpent,
      avgMargin,
      burnThisMonth,
      overload,
      arByProject,
      criticalCount: alerts.filter((a) => a.severity === "critical").length,
    };
  }, [
    profiles,
    projects,
    phases,
    allocations,
    expenses,
    payments,
    salaryHistory,
  ]);

  const portfolio = useMemo(() => {
    let rows = computed.finances;
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.project.status === statusFilter);
    }
    const sorted = [...rows].sort((a, b) => {
      switch (sort) {
        case "profit":
          return b.finance.profit - a.finance.profit;
        case "spent":
          return b.finance.totalSpent - a.finance.totalSpent;
        case "utilization":
          return b.finance.utilization - a.finance.utilization;
        case "name":
          return a.project.name.localeCompare(b.project.name, "vi");
        case "margin":
        default:
          if (!a.finance.hasRevenue && !b.finance.hasRevenue) return 0;
          if (!a.finance.hasRevenue) return 1;
          if (!b.finance.hasRevenue) return -1;
          return a.finance.margin - b.finance.margin;
      }
    });
    return sorted;
  }, [computed.finances, sort, statusFilter]);

  function exportPortfolio() {
    downloadCsv(
      `pm-eye-portfolio-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Dự án",
        "Status",
        "Doanh thu",
        "Chi phí",
        "Lợi nhuận",
        "Margin %",
        "Budget",
        "Utilization %",
        "Client",
      ],
      portfolio.map(({ project, finance }) => [
        project.name,
        project.status,
        Math.round(finance.revenue),
        Math.round(finance.totalSpent),
        Math.round(finance.profit),
        finance.hasRevenue ? Math.round(finance.margin * 100) : "",
        finance.hasCap ? Math.round(finance.budget) : "",
        finance.hasCap ? Math.round(finance.utilization * 100) : "",
        project.client ?? "",
      ])
    );
  }

  const chartData = computed.timeline.map((t) => ({
    name: t.label,
    burn: Math.round(t.total / 1_000_000),
    labor: Math.round(t.labor / 1_000_000),
    ops: Math.round(t.ops / 1_000_000),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Insights"
        subtitle="P&L portfolio, rủi ro, công nợ và capacity — nhìn kỹ trước khi ra quyết định."
        actions={
          <Button variant="outline" onClick={exportPortfolio}>
            <Download size={14} />
            Xuất CSV
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi
          label="Doanh thu"
          value={formatCurrency(computed.totalRevenue)}
          icon={<TrendingUp size={14} />}
          tone="teal"
        />
        <Kpi
          label="Lợi nhuận"
          value={formatCurrency(computed.totalProfit)}
          icon={<PiggyBank size={14} />}
          tone={computed.totalProfit >= 0 ? "emerald" : "rose"}
        />
        <Kpi
          label="Margin TB"
          value={`${Math.round(computed.avgMargin * 100)}%`}
          icon={<LineChart size={14} />}
          tone={computed.avgMargin >= 0.2 ? "emerald" : "amber"}
        />
        <Kpi
          label="Burn tháng"
          value={formatCurrency(computed.burnThisMonth)}
          icon={<Wallet size={14} />}
          tone="sky"
        />
        <Kpi
          label="AR quá hạn"
          value={formatCurrency(computed.ar.totalOverdue)}
          icon={<AlertTriangle size={14} />}
          tone={computed.ar.totalOverdue > 0 ? "rose" : "emerald"}
        />
        <Kpi
          label="Rủi ro critical"
          value={String(computed.criticalCount)}
          icon={<Flame size={14} />}
          tone={computed.criticalCount > 0 ? "rose" : "emerald"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Portfolio table */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="font-display text-base">
                Portfolio P&amp;L
              </CardTitle>
              <CardDescription>
                Xếp theo margin thấp → cao để ưu tiên xử lý.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["ongoing", "planned", "paused", "completed", "all"] as const).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "h-7 rounded-lg border border-border/60 px-2.5 text-[11px] ring-1 ring-transparent transition",
                      statusFilter === s
                        ? "border-teal-500/30 bg-teal-500/10 text-teal-800 ring-teal-500/20 dark:text-teal-300"
                        : "hover:bg-muted/60"
                    )}
                  >
                    {s === "all"
                      ? "Tất cả"
                      : s === "ongoing"
                      ? "Đang chạy"
                      : s === "planned"
                      ? "Kế hoạch"
                      : s === "paused"
                      ? "Tạm dừng"
                      : "Đã đóng"}
                  </button>
                )
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(
                [
                  ["margin", "Margin"],
                  ["profit", "Lợi nhuận"],
                  ["spent", "Chi phí"],
                  ["utilization", "Budget %"],
                  ["name", "Tên"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSort(k)}
                    className={cn(
                      "h-7 rounded-lg border border-border/60 px-2.5 text-[11px] ring-1 ring-transparent transition",
                      sort === k
                        ? "border-teal-500/25 bg-teal-500/[0.08] text-teal-900 ring-teal-500/15 dark:text-teal-200"
                        : "hover:bg-muted/60"
                    )}
                >
                  Sort: {label}
                </button>
              ))}
            </div>

            {portfolio.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Không có dự án trong bộ lọc này.
              </div>
            ) : (
              <div className="space-y-1.5">
                {portfolio.map(({ project, finance }) => (
                  <ProjectRow
                    key={project.id}
                    projectName={project.name}
                    projectId={project.id}
                    client={project.client}
                    color={project.color}
                    finance={finance}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <span
                className={
                  computed.criticalCount > 0
                    ? "status-dot status-dot-rose"
                    : "status-dot"
                }
              />
              Bảng rủi ro
            </CardTitle>
            <CardDescription>
              {computed.alerts.length} điểm · {computed.criticalCount} critical
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[520px] overflow-y-auto no-scrollbar">
            {computed.alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Portfolio đang sạch rủi ro nổi bật.
              </div>
            ) : (
              computed.alerts.slice(0, 24).map((a) => (
                <Link
                  key={a.id}
                  href={a.href ?? "/"}
                  className={cn(
                    "block rounded-xl border p-3 transition hover:border-primary/30",
                    SEV[a.severity]
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium leading-snug">
                      {a.title}
                    </div>
                    <Badge
                      variant={
                        a.severity === "critical"
                          ? "destructive"
                          : a.severity === "warn"
                          ? "warning"
                          : "secondary"
                      }
                      className="shrink-0 text-[10px]"
                    >
                      {a.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {a.detail}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Burn chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">
              Burn 6 tháng
            </CardTitle>
            <CardDescription>Lương + chi phí vận hành (triệu ₫)</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [
                    `${v}tr`,
                    name === "labor" ? "Lương" : name === "ops" ? "Ops" : "Tổng",
                  ]}
                />
                <Bar dataKey="labor" stackId="a" fill="hsl(var(--teal))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ops" stackId="a" fill="hsl(var(--sky))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Overload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Users size={16} className="text-amber-500" />
              Quá tải / peak 30 ngày
            </CardTitle>
            <CardDescription>
              Người đang &gt;100% hoặc sắp peak trong tháng tới.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[260px] overflow-y-auto no-scrollbar">
            {computed.overload.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Không ai overload — capacity ổn.
              </div>
            ) : (
              computed.overload.map((o) => (
                <div
                  key={o.profile.id}
                  className="flex items-center gap-3 rounded-xl border p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {o.profile.full_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {o.profile.job_role} · {loadStatusLabel(o.status)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={cn(
                        "text-sm font-semibold tnum",
                        o.now > 1 ? "text-rose-500" : "text-amber-500"
                      )}
                    >
                      {formatPercent(o.now)}
                    </div>
                    <div className="text-[10px] text-muted-foreground tnum">
                      peak {formatPercent(o.peak)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <Link
              href="/allocations"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              Mở phân bổ <ArrowUpRight size={12} />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* AR aging */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">
            Công nợ theo dự án
          </CardTitle>
          <CardDescription>
            Planned / Invoiced / Paid / Overdue — chase đúng chỗ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {computed.arByProject.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Chưa có milestone thanh toán nào.
            </div>
          ) : (
            <div className="space-y-2">
              {computed.arByProject.map((row) => {
                const total =
                  row.totalPaid +
                  row.totalInvoiced +
                  row.totalPlanned +
                  row.totalOverdue;
                const paidPct = total > 0 ? row.totalPaid / total : 0;
                return (
                  <Link
                    key={row.project.id}
                    href={`/projects/${row.project.id}`}
                    className="block rounded-xl border p-3 hover:border-primary/30 transition"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {row.project.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Đã thu {formatCurrency(row.totalPaid)}
                          {row.totalOverdue > 0 && (
                            <span className="text-rose-500 font-medium">
                              {" "}
                              · Quá hạn {formatCurrency(row.totalOverdue)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground shrink-0">
                        <div>Chờ: {formatCurrency(row.totalInvoiced)}</div>
                        <div>KH: {formatCurrency(row.totalPlanned)}</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${paidPct * 100}%` }}
                      />
                      <div
                        className="h-full bg-amber-500"
                        style={{
                          width: `${
                            total > 0 ? (row.totalInvoiced / total) * 100 : 0
                          }%`,
                        }}
                      />
                      <div
                        className="h-full bg-rose-500"
                        style={{
                          width: `${
                            total > 0 ? (row.totalOverdue / total) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "teal" | "emerald" | "rose" | "amber" | "sky";
}) {
  const tones = {
    teal: "text-teal-600 dark:text-teal-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
    sky: "text-sky-600 dark:text-sky-400",
  };
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 p-3.5 ring-1 ring-border/30 transition hover:border-teal-500/20">
      <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", tones[tone])}>
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-semibold tracking-tight tnum">
        {value}
      </div>
    </div>
  );
}

function ProjectRow({
  projectName,
  projectId,
  client,
  color,
  finance,
}: {
  projectName: string;
  projectId: string;
  client: string | null;
  color: string | null;
  finance: ProjectFinance;
}) {
  const marginTone =
    !finance.hasRevenue
      ? "text-muted-foreground"
      : finance.margin < 0
      ? "text-rose-500"
      : finance.margin < 0.1
      ? "text-amber-500"
      : "text-emerald-500";

  return (
    <Link
      href={`/projects/${projectId}`}
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5 hover:border-primary/30 transition group"
    >
      <span
        className="w-2 h-8 rounded-full shrink-0"
        style={{ background: color || "hsl(var(--teal))" }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate group-hover:text-primary transition">
          {projectName}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {client || "—"} · Chi {formatCurrency(finance.totalSpent)}
          {finance.hasCap && (
            <> · Budget {Math.round(finance.utilization * 100)}%</>
          )}
        </div>
        {finance.hasCap && (
          <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden max-w-[220px]">
            <div
              className={cn(
                "h-full rounded-full",
                finance.overBudget
                  ? "bg-rose-500"
                  : finance.utilization > 0.85
                  ? "bg-amber-500"
                  : "bg-teal-500"
              )}
              style={{ width: `${Math.min(100, finance.utilization * 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className={cn("text-sm font-semibold tnum", marginTone)}>
          {finance.hasRevenue ? `${Math.round(finance.margin * 100)}%` : "—"}
        </div>
        <div className="text-[10px] text-muted-foreground tnum">
          {finance.hasRevenue ? formatCurrency(finance.profit) : "chưa DT"}
        </div>
      </div>
      <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
    </Link>
  );
}

"use client";

import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldGrid } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { projectFinance, type ProjectFinance } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/client";
import {
  cn,
  formatCurrency,
  formatDate,
  formatPercent,
  humanizeSupabaseError,
  toDateInput,
} from "@/lib/utils";
import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPhase,
  SalaryHistory,
} from "@/types/database";
import {
  AlertTriangle,
  Activity,
  ArrowUpRight,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  TrendingUp,
  Trash2,
  Wallet,
} from "lucide-react";
import { useAppData } from "@/lib/hooks/useAppData";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["planned", "ongoing", "paused", "completed"] as const;
const STATUS_LABEL: Record<string, string> = {
  planned: "Lên kế hoạch",
  ongoing: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Đã đóng",
};

const BILLING_OPTIONS = ["fixed", "mm", "tnm"] as const;
const BILLING_LABEL: Record<string, string> = {
  fixed: "Fixed-price (trọn gói)",
  mm: "Man-month",
  tnm: "T&M (time & materials)",
};
const STATUS_VARIANT: Record<
  string,
  "secondary" | "info" | "success" | "warning"
> = {
  planned: "info",
  ongoing: "success",
  paused: "warning",
  completed: "secondary",
};

const PRESET_COLORS = [
  "#0d9488",
  "#0284c7",
  "#059669",
  "#d97706",
  "#e11d48",
  "#0e7490",
  "#64748b",
];

export function ProjectsClient({
  initialProjects,
  phases,
  allocations,
  expenses,
  profiles,
  salaryHistory,
}: {
  initialProjects: Project[];
  phases: ProjectPhase[];
  allocations: Allocation[];
  expenses: OperatingExpense[];
  profiles: Profile[];
  salaryHistory: SalaryHistory[];
}) {
  const supabase = createClient();
  const { mutate, data: appData } = useAppData();
  const canViewMoney = appData?.user.canViewMoney ?? false;
  const canWrite =
    appData?.user.role === "admin" ||
    appData?.user.role === "manager" ||
    appData?.user.role === "pm";
  const [projects, setProjects] = useState(initialProjects);
  useEffect(() => setProjects(initialProjects), [initialProjects]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [status, setStatus] = useState<string>("planned");
  const [billingType, setBillingType] = useState<string>("fixed");
  const [managerId, setManagerId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters / sort
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "recent" | "name" | "profit" | "spent"
  >("recent");

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  function openNew() {
    setEditing(null);
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setStatus("planned");
    setBillingType("fixed");
    setManagerId("none");
    setError(null);
    setOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setColor(p.color);
    setStatus(p.status);
    setBillingType(p.billing_type ?? "fixed");
    setManagerId(p.manager_id ?? "none");
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      client: (fd.get("client") as string) || null,
      total_budget: canViewMoney ? Number(fd.get("total_budget") || 0) : 0,
      consumed_before: canViewMoney
        ? Number(fd.get("consumed_before") || 0)
        : 0,
      revenue: canViewMoney ? Number(fd.get("revenue") || 0) : 0,
      billing_type: billingType,
      mm_rate: canViewMoney ? Number(fd.get("mm_rate") || 0) : 0,
      status,
      start_date: (fd.get("start_date") as string) || null,
      end_date: (fd.get("end_date") as string) || null,
      description: (fd.get("description") as string) || null,
      color,
      manager_id: managerId === "none" ? null : managerId,
    };

    if (editing) {
      const { data, error: err } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(humanizeSupabaseError(err.message));
        return;
      }
      if (data) {
        const next = data as Project;
        setProjects((arr) => arr.map((p) => (p.id === editing.id ? next : p)));
        mutate((prev) => ({
          ...prev,
          projects: prev.projects.map((p) => (p.id === editing.id ? next : p)),
        }));
        toast.success(`Đã cập nhật ${next.name}`);
        setOpen(false);
      }
    } else {
      const { data, error: err } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(humanizeSupabaseError(err.message));
        return;
      }
      if (data) {
        const next = data as Project;
        setProjects((arr) => [next, ...arr]);
        mutate((prev) => ({
          ...prev,
          projects: [next, ...prev.projects],
        }));
        toast.success(`Đã tạo dự án ${next.name}`);
        setOpen(false);
      }
    }
  }

  async function remove(p: Project) {
    if (
      !confirm(`Xóa dự án "${p.name}"? Tất cả phases và allocations sẽ mất.`)
    )
      return;
    const { error: err } = await supabase.from("projects").delete().eq("id", p.id);
    if (err) {
      toast.error(humanizeSupabaseError(err.message));
      return;
    }
    setProjects((arr) => arr.filter((x) => x.id !== p.id));
    mutate((prev) => ({
      ...prev,
      projects: prev.projects.filter((x) => x.id !== p.id),
    }));
    toast.success(`Đã xóa ${p.name}`);
  }

  // Filter + sort
  const filteredProjects = useMemo(() => {
    let arr = projects;
    if (statusFilter !== "all") {
      arr = arr.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.client ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...arr];
    if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "profit") {
      sorted.sort((a, b) => {
        const fa = projectFinance(a, allocations, profilesById, expenses, undefined, salaryHistory);
        const fb = projectFinance(b, allocations, profilesById, expenses, undefined, salaryHistory);
        return fb.profit - fa.profit;
      });
    } else if (sortBy === "spent") {
      sorted.sort((a, b) => {
        const fa = projectFinance(a, allocations, profilesById, expenses, undefined, salaryHistory);
        const fb = projectFinance(b, allocations, profilesById, expenses, undefined, salaryHistory);
        return fb.totalSpent - fa.totalSpent;
      });
    }
    return sorted;
  }, [projects, statusFilter, search, sortBy, allocations, profilesById, expenses]);

  // Stats summary
  const statsSummary = useMemo(() => {
    const total = projects.length;
    const ongoing = projects.filter((p) => p.status === "ongoing").length;
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalSpent = 0;
    let lossCount = 0;
    let overBudgetCount = 0;
    let withRevenueCount = 0;
    for (const p of projects) {
      const f = projectFinance(
        p,
        allocations,
        profilesById,
        expenses,
        undefined,
        salaryHistory
      );
      totalRevenue += f.revenue;
      totalSpent += f.totalSpent;
      if (f.hasRevenue) {
        totalProfit += f.profit;
        withRevenueCount++;
        if (f.profit < 0) lossCount++;
      }
      if (f.hasCap && f.overBudget) overBudgetCount++;
    }
    const avgMargin =
      totalRevenue > 0 ? totalProfit / totalRevenue : 0;
    return {
      total,
      ongoing,
      totalRevenue,
      totalProfit,
      totalSpent,
      avgMargin,
      lossCount,
      overBudgetCount,
      withRevenueCount,
    };
  }, [projects, allocations, profilesById, expenses, salaryHistory]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace · Dự án"
        title="Portfolio dự án"
        subtitle="Theo dõi ngân sách, doanh thu, lợi nhuận và sức khỏe từng dự án trong portfolio."
        actions={
          <Button variant="brand" onClick={openNew}>
            <Plus /> Thêm dự án
          </Button>
        }
      />

      {/* Hero KPIs */}
      {projects.length > 0 && (
        <div
          className={
            canViewMoney
              ? "grid grid-cols-2 gap-3 lg:grid-cols-5"
              : "grid grid-cols-2 gap-3 lg:grid-cols-2"
          }
        >
          <KpiCard
            label="Tổng dự án"
            value={statsSummary.total.toString()}
            hint={`${statsSummary.ongoing} đang chạy`}
            tone="teal"
            icon={<Briefcase size={14} />}
          />
          {canViewMoney && (
            <>
              <KpiCard
                label="Tổng doanh thu"
                value={formatCurrency(statsSummary.totalRevenue)}
                hint={
                  statsSummary.withRevenueCount > 0
                    ? `${statsSummary.withRevenueCount} dự án có doanh thu`
                    : "Chưa có dự án nào ghi doanh thu"
                }
                tone="cyan"
                icon={<Wallet size={14} />}
              />
              <KpiCard
                label={
                  statsSummary.totalProfit >= 0 ? "Lợi nhuận" : "Đang lỗ"
                }
                value={formatCurrency(statsSummary.totalProfit)}
                hint={`Margin TB ${formatPercent(statsSummary.avgMargin)}`}
                tone={
                  statsSummary.totalProfit >= 0
                    ? statsSummary.lossCount > 0
                      ? "amber"
                      : "emerald"
                    : "rose"
                }
                icon={<TrendingUp size={14} />}
              />
              <KpiCard
                label="Đã tiêu"
                value={formatCurrency(statsSummary.totalSpent)}
                hint="Lương + vận hành"
                tone="sky"
                icon={<Activity size={14} />}
              />
            </>
          )}
          <KpiCard
            label="Cảnh báo"
            value={(
              statsSummary.lossCount + statsSummary.overBudgetCount
            ).toString()}
            hint={
              canViewMoney &&
              (statsSummary.lossCount > 0 || statsSummary.overBudgetCount > 0)
                ? `${statsSummary.lossCount} lỗ · ${statsSummary.overBudgetCount} vượt cap`
                : canViewMoney
                  ? "Tất cả OK"
                  : `${statsSummary.ongoing} đang chạy`
            }
            tone={
              statsSummary.lossCount + statsSummary.overBudgetCount > 0
                ? "rose"
                : "emerald"
            }
            icon={<AlertTriangle size={14} />}
          />
        </div>
      )}

      {/* Filter toolbar */}
      {projects.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm sm:flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Tìm theo tên dự án hoặc khách hàng…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-muted/40 p-1 ring-1 ring-border/50">
              {(["all", "ongoing", "planned", "paused", "completed"] as const).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "h-8 rounded-lg px-3 text-xs font-medium transition",
                      statusFilter === s
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s === "all" ? "Tất cả" : STATUS_LABEL[s]}
                  </button>
                )
              )}
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-10 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mới tạo trước</SelectItem>
                <SelectItem value="name">Theo tên</SelectItem>
                {canViewMoney && (
                  <>
                    <SelectItem value="profit">Lợi nhuận cao</SelectItem>
                    <SelectItem value="spent">Đã tiêu nhiều</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.length === 0 && (
          <Card className="col-span-full border-0 ring-1 ring-border/70">
            <EmptyState
              icon={Briefcase}
              tone="indigo"
              title="Chưa có dự án nào"
              description="Tạo dự án đầu tiên để bắt đầu track P&L, team và dòng tiền cho phòng ban."
              action={
                <Button variant="brand" onClick={openNew}>
                  <Plus /> Tạo dự án đầu tiên
                </Button>
              }
            />
          </Card>
        )}

        {projects.length > 0 && filteredProjects.length === 0 && (
          <Card className="col-span-full border-0 ring-1 ring-border/70">
            <EmptyState
              icon={Search}
              tone="sky"
              title="Không tìm thấy dự án"
              description={`Không có dự án nào khớp với bộ lọc hiện tại. Thử bỏ filter hoặc đổi từ khoá tìm kiếm.`}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Reset bộ lọc
                </Button>
              }
            />
          </Card>
        )}

        {filteredProjects.map((p, idx) => {
          const fin = projectFinance(p, allocations, profilesById, expenses, undefined, salaryHistory);
          const phaseCount = phases.filter((ph) => ph.project_id === p.id).length;

          // Active team
          const today = new Date();
          const memberMap = new Map<string, number>();
          for (const a of allocations) {
            if (a.project_id !== p.id) continue;
            if (new Date(a.start_date) > today || new Date(a.end_date) < today)
              continue;
            memberMap.set(
              a.user_id,
              (memberMap.get(a.user_id) ?? 0) + Number(a.percent)
            );
          }
          const members = Array.from(memberMap.entries())
            .map(([uid, percent]) => ({
              profile: profilesById.get(uid),
              percent,
            }))
            .filter((m): m is { profile: Profile; percent: number } => !!m.profile)
            .sort((a, b) => b.percent - a.percent);

          return (
            <div
              key={p.id}
              className="group relative animate-fade-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <Card className="relative overflow-hidden border-0 ring-1 ring-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:ring-border">
                {/* Color stripe + glow */}
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${p.color}, ${p.color}88)`,
                  }}
                />
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.12] blur-3xl transition-opacity duration-500 group-hover:opacity-[0.22]"
                  style={{ background: p.color }}
                />

                <CardContent className="relative space-y-4 p-5 sm:p-6">
                  {/* Header: name + status + menu */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/50"
                      style={{ background: `${p.color}18` }}
                    >
                      <Briefcase size={15} style={{ color: p.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${p.id}`}
                        className="block truncate font-display text-base font-semibold tracking-tight transition hover:text-teal-600 dark:hover:text-teal-400 sm:text-lg"
                      >
                        {p.name}
                      </Link>
                      {p.client && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p.client}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Badge
                        variant={STATUS_VARIANT[p.status]}
                        className="gap-1.5"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background:
                              p.status === "ongoing"
                                ? "rgb(16 185 129)"
                                : p.status === "paused"
                                ? "rgb(245 158 11)"
                                : p.status === "completed"
                                ? "rgb(148 163 184)"
                                : "rgb(56 189 248)",
                          }}
                        />
                        {STATUS_LABEL[p.status]}
                      </Badge>

                      <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg opacity-60 transition hover:bg-muted hover:opacity-100 focus:outline-none group-hover:opacity-100">
                        <MoreHorizontal size={14} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil />
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${p.id}`}>
                            <ArrowUpRight />
                            Mở chi tiết
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => remove(p)}
                          className="text-rose-600 focus:text-rose-600"
                        >
                          <Trash2 />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </div>

                  {/* P&L hero — chỉ admin/manager/pm */}
                  {canViewMoney && (
                    <div className="rounded-xl bg-muted/25 p-3.5 ring-1 ring-border/40">
                      {fin.hasRevenue ? (
                        <ProfitBlock fin={fin} />
                      ) : fin.hasCap ? (
                        <CostCapBlock fin={fin} />
                      ) : (
                        <NoCapBlock fin={fin} />
                      )}
                    </div>
                  )}

                  {/* Team */}
                  <div className="flex items-center gap-3 border-t border-border/50 pt-3.5">
                    {members.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground italic flex-1">
                        Chưa phân bổ ai
                      </div>
                    ) : (
                      <>
                        <div className="flex -space-x-2">
                          {members.slice(0, 5).map((m) => (
                            <Tooltip key={m.profile.id}>
                              <TooltipTrigger asChild>
                                <Avatar className="w-7 h-7 ring-2 ring-card hover:scale-110 hover:z-10 transition cursor-default">
                                  <AvatarFallback className="text-[10px]">
                                    {m.profile.full_name?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="font-medium">
                                  {m.profile.full_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {m.profile.job_role} · {formatPercent(m.percent)}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {members.length > 5 && (
                            <div className="w-7 h-7 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              +{members.length - 5}
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex-1 truncate">
                          {members.length} người ·{" "}
                          {members
                            .reduce((s, m) => s + m.percent, 0)
                            .toFixed(1)}{" "}
                          FTE
                        </div>
                      </>
                    )}
                  </div>

                  {/* Meta footer */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-muted/80 px-1 text-[10px] font-semibold tnum">
                        {phaseCount}
                      </span>
                      giai đoạn
                    </span>
                    <span className="truncate pl-2">
                      {p.start_date && p.end_date
                        ? `${formatDate(p.start_date)} → ${formatDate(p.end_date)}`
                        : p.start_date
                        ? `Từ ${formatDate(p.start_date)} · Vận hành`
                        : "—"}
                    </span>
                  </div>

                  {/* Primary CTA */}
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="group/btn w-full ring-1 ring-border/50"
                  >
                    <Link
                      href={`/projects/${p.id}`}
                      className="flex items-center justify-center gap-1.5"
                    >
                      Mở chi tiết
                      <ArrowUpRight
                        size={12}
                        className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"
                      />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa dự án" : "Thêm dự án"}</DialogTitle>
            <DialogDescription>
              Tạo dự án mới và bắt đầu chia giai đoạn để theo dõi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} key={editing?.id ?? "new-project"}>
            <DialogBody>
            <FieldGrid>
              <Field>
                <Label htmlFor="name">Tên dự án</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                />
              </Field>
              <Field>
                <Label htmlFor="client">Khách hàng</Label>
                <Input
                  id="client"
                  name="client"
                  defaultValue={editing?.client ?? ""}
                />
              </Field>
            </FieldGrid>
            {canViewMoney && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="total_budget">Ngân sách / Cap (VND)</Label>
                    <Input
                      id="total_budget"
                      name="total_budget"
                      type="number"
                      min="0"
                      step="1000000"
                      placeholder="0 = không cap (maintenance)"
                      defaultValue={editing?.total_budget ?? 0}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Để <strong>0</strong> nếu là dự án vận hành chia đợt — tool sẽ track theo phase.
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consumed_before">
                      Đã tiêu trước đó (VND)
                    </Label>
                    <Input
                      id="consumed_before"
                      name="consumed_before"
                      type="number"
                      min="0"
                      step="1000000"
                      placeholder="0"
                      defaultValue={editing?.consumed_before ?? 0}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Phần budget đã chi trước khi dùng tool. Để 0 nếu là dự án mới.
                    </div>
                  </div>
                </div>

                {/* Revenue section */}
                <div className="space-y-3 rounded-2xl bg-emerald-500/[0.06] p-4 ring-1 ring-emerald-500/15">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-emerald-500" />
                    <Label className="mb-0">Doanh thu (khách trả)</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="revenue" className="text-xs">
                        Doanh thu dự kiến (VND)
                      </Label>
                      <Input
                        id="revenue"
                        name="revenue"
                        type="number"
                        min="0"
                        step="1000000"
                        placeholder="0 = chưa biết"
                        defaultValue={editing?.revenue ?? 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Hình thức billing</Label>
                      <Select value={billingType} onValueChange={setBillingType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_OPTIONS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {BILLING_LABEL[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {billingType !== "fixed" && (
                    <div className="space-y-2">
                      <Label htmlFor="mm_rate" className="text-xs">
                        Đơn giá VND / man-month
                      </Label>
                      <Input
                        id="mm_rate"
                        name="mm_rate"
                        type="number"
                        min="0"
                        step="1000000"
                        placeholder="VD: 25,000,000"
                        defaultValue={editing?.mm_rate ?? 0}
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Để tham khảo. Doanh thu thực tế lấy theo invoice/payment.
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] text-muted-foreground">
                    Profit = Doanh thu − (Lương team + Vận hành + Đã tiêu trước).
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PM phụ trách</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Chưa gán —</SelectItem>
                    {profiles
                      .filter(
                        (p) =>
                          p.is_active &&
                          (p.app_role === "pm" ||
                            p.app_role === "manager" ||
                            p.app_role === "admin" ||
                            p.job_role === "PM")
                      )
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Màu</Label>
              <div className="flex items-center gap-1.5 h-9">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-background ring-teal-500 scale-110"
                        : "hover:scale-110"
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Ngày bắt đầu</Label>
                <DatePicker
                  id="start_date"
                  name="start_date"
                  defaultValue={toDateInput(editing?.start_date)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Ngày kết thúc</Label>
                <DatePicker
                  id="end_date"
                  name="end_date"
                  defaultValue={toDateInput(editing?.end_date)}
                />
                <div className="text-[11px] text-muted-foreground">
                  Để trống nếu dự án vận hành liên tục.
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
              />
            </div>

            {error && (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            </DialogBody>

            <DialogFooter className="sm:justify-between">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Hủy
              </Button>
              <Button type="submit" variant="brand" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================
// P&L blocks for project card
// =============================================================

function ProfitBlock({ fin }: { fin: ProjectFinance }) {
  const m = fin.marginStatus;
  const tone =
    m === "loss"
      ? { text: "text-rose-500", bar: "linear-gradient(90deg, #fb7185, #f43f5e)", label: "Đang lỗ", badgeVariant: "destructive" as const }
      : m === "thin"
      ? { text: "text-amber-500", bar: "linear-gradient(90deg, #fbbf24, #f59e0b)", label: "Margin mỏng", badgeVariant: "warning" as const }
      : m === "ok"
      ? { text: "text-sky-500", bar: "linear-gradient(90deg, #38bdf8, #0ea5e9)", label: "OK", badgeVariant: "info" as const }
      : { text: "text-emerald-500", bar: "linear-gradient(90deg, #34d399, #10b981)", label: "Healthy", badgeVariant: "success" as const };

  // visualize cost as portion of revenue, capped at 100%
  const costPct = fin.revenue > 0 ? Math.min(1.2, fin.totalSpent / fin.revenue) : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Profit
          </div>
          <div className={cn("mt-0.5 font-display text-lg font-semibold tnum", tone.text)}>
            {formatCurrency(fin.profit)}
          </div>
        </div>
        <Badge variant={tone.badgeVariant}>
          {tone.label} · {formatPercent(fin.margin)}
        </Badge>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${Math.min(100, costPct * 100)}%`,
            background: tone.bar,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tnum">
        <span>Chi: {formatCurrency(fin.totalSpent)}</span>
        <span>DT: {formatCurrency(fin.revenue)}</span>
      </div>
    </div>
  );
}

function CostCapBlock({ fin }: { fin: ProjectFinance }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">Đã tiêu</span>
        <span
          className={cn(
            "tabular-nums font-medium",
            fin.overBudget
              ? "text-rose-500"
              : fin.utilization > 0.85
              ? "text-amber-500"
              : "text-foreground"
          )}
        >
          {formatPercent(fin.utilization)}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${Math.min(100, fin.utilization * 100)}%`,
            background: fin.overBudget
              ? "linear-gradient(90deg, #fb7185, #f43f5e)"
              : fin.utilization > 0.85
              ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
              : "linear-gradient(90deg, #34d399, #10b981)",
          }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 tnum">
        <span>{formatCurrency(fin.totalSpent)}</span>
        <span>/ cap {formatCurrency(fin.budget)}</span>
      </div>
    </div>
  );
}

function NoCapBlock({ fin }: { fin: ProjectFinance }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Đã tiêu (no cap)
        </div>
        <div className="mt-0.5 font-display text-lg font-semibold tnum">
          {formatCurrency(fin.totalSpent)}
        </div>
      </div>
      <Badge variant="info">Vận hành</Badge>
    </div>
  );
}

type Tone = "teal" | "cyan" | "emerald" | "rose" | "amber" | "sky";
const TONE_MAP: Record<Tone, { bg: string; text: string; iconBg: string; ring: string }> = {
  teal: {
    bg: "bg-teal-500/[0.06]",
    text: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-500/10 ring-teal-500/20",
    ring: "ring-teal-500/15",
  },
  cyan: {
    bg: "bg-cyan-500/[0.06]",
    text: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 ring-cyan-500/20",
    ring: "ring-cyan-500/15",
  },
  emerald: {
    bg: "bg-emerald-500/[0.06]",
    text: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 ring-emerald-500/20",
    ring: "ring-emerald-500/15",
  },
  rose: {
    bg: "bg-rose-500/[0.06]",
    text: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10 ring-rose-500/20",
    ring: "ring-rose-500/15",
  },
  amber: {
    bg: "bg-amber-500/[0.06]",
    text: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 ring-amber-500/20",
    ring: "ring-amber-500/15",
  },
  sky: {
    bg: "bg-sky-500/[0.06]",
    text: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-500/10 ring-sky-500/20",
    ring: "ring-sky-500/15",
  },
};

function KpiCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
  icon: React.ReactNode;
}) {
  const t = TONE_MAP[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-3.5 ring-1 ring-border/70 lg:p-4",
        t.bg,
        t.ring
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1",
            t.iconBg,
            t.text
          )}
        >
          {icon}
        </span>
        <span className="text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "truncate font-display text-base font-semibold tnum tracking-tight lg:text-lg",
          t.text
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 truncate text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

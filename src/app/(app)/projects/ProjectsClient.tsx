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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowUpRight,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
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
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [status, setStatus] = useState<string>("planned");
  const [billingType, setBillingType] = useState<string>("fixed");
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
    setError(null);
    setOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setColor(p.color);
    setStatus(p.status);
    setBillingType(p.billing_type ?? "fixed");
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
      total_budget: Number(fd.get("total_budget") || 0),
      consumed_before: Number(fd.get("consumed_before") || 0),
      revenue: Number(fd.get("revenue") || 0),
      billing_type: billingType,
      mm_rate: Number(fd.get("mm_rate") || 0),
      status,
      start_date: (fd.get("start_date") as string) || null,
      end_date: (fd.get("end_date") as string) || null,
      description: (fd.get("description") as string) || null,
      color,
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
        setProjects((arr) =>
          arr.map((p) => (p.id === editing.id ? (data as Project) : p))
        );
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
        setProjects((arr) => [data as Project, ...arr]);
        setOpen(false);
      }
    }
  }

  async function remove(p: Project) {
    if (
      !confirm(`Xóa dự án "${p.name}"? Tất cả phases và allocations sẽ mất.`)
    )
      return;
    await supabase.from("projects").delete().eq("id", p.id);
    setProjects((arr) => arr.filter((x) => x.id !== p.id));
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
    let lossCount = 0;
    for (const p of projects) {
      const f = projectFinance(p, allocations, profilesById, expenses, undefined, salaryHistory);
      totalRevenue += f.revenue;
      if (f.hasRevenue) {
        totalProfit += f.profit;
        if (f.profit < 0) lossCount++;
      }
    }
    return { total, ongoing, totalRevenue, totalProfit, lossCount };
  }, [projects, allocations, profilesById, expenses]);

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

      {/* Summary strip */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryStat label="Tổng dự án" value={statsSummary.total.toString()} />
          <SummaryStat
            label="Đang chạy"
            value={statsSummary.ongoing.toString()}
            tone="success"
          />
          <SummaryStat
            label="Tổng doanh thu"
            value={formatCurrency(statsSummary.totalRevenue)}
            tone="indigo"
          />
          <SummaryStat
            label={statsSummary.totalProfit >= 0 ? "Lợi nhuận" : "Đang lỗ"}
            value={formatCurrency(statsSummary.totalProfit)}
            tone={
              statsSummary.totalProfit >= 0
                ? statsSummary.lossCount > 0
                  ? "warning"
                  : "success"
                : "danger"
            }
            hint={
              statsSummary.lossCount > 0
                ? `${statsSummary.lossCount} dự án lỗ`
                : undefined
            }
          />
        </div>
      )}

      {/* Filter toolbar */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="search"
              placeholder="Tìm theo tên dự án hoặc khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
            {(["all", "ongoing", "planned", "paused", "completed"] as const).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 h-7 rounded-md text-xs font-medium transition",
                    statusFilter === s
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s === "all" ? "Tất cả" : STATUS_LABEL[s]}
                </button>
              )
            )}
          </div>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mới tạo trước</SelectItem>
              <SelectItem value="name">Theo tên</SelectItem>
              <SelectItem value="profit">Lợi nhuận cao</SelectItem>
              <SelectItem value="spent">Đã tiêu nhiều</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.length === 0 && (
          <Card className="col-span-full">
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
          <Card className="col-span-full">
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
              <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
                {/* Color stripe + glow */}
                <div
                  className="absolute top-0 inset-x-0 h-1.5"
                  style={{
                    background: `linear-gradient(90deg, ${p.color}, ${p.color}aa)`,
                  }}
                />
                <div
                  className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
                  style={{ background: p.color }}
                />

                <CardContent className="relative p-6 space-y-4">
                  {/* Header: name + status + menu */}
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-semibold text-lg tracking-tight hover:text-indigo-500 transition truncate block"
                      >
                        {p.name}
                      </Link>
                      {p.client && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {p.client}
                        </div>
                      )}
                    </div>

                    <Badge
                      variant={STATUS_VARIANT[p.status]}
                      className="shrink-0 gap-1.5"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
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
                      <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-accent focus:outline-none">
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

                  {/* P&L hero */}
                  {fin.hasRevenue ? (
                    <ProfitBlock fin={fin} />
                  ) : fin.hasCap ? (
                    <CostCapBlock fin={fin} />
                  ) : (
                    <NoCapBlock fin={fin} />
                  )}

                  {/* Team */}
                  <div className="flex items-center gap-3 pt-3 border-t">
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
                                  {m.profile.role} · {formatPercent(m.percent)}
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
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 rounded bg-muted text-[9px] font-semibold"
                      >
                        {phaseCount}
                      </span>
                      giai đoạn
                    </span>
                    <span>
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
                    className="w-full group/btn"
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
          <form
            onSubmit={onSubmit}
            className="space-y-4"
            key={editing?.id ?? "new-project"}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Tên dự án</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Khách hàng</Label>
                <Input
                  id="client"
                  name="client"
                  defaultValue={editing?.client ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="rounded-xl border bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                <Label className="mb-0">Doanh thu (khách trả)</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
                          ? "ring-2 ring-offset-2 ring-offset-background ring-indigo-500 scale-110"
                          : "hover:scale-110"
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Ngày bắt đầu</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={toDateInput(editing?.start_date)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Ngày kết thúc</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
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

            <DialogFooter>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Profit
          </div>
          <div className={cn("text-base font-semibold tnum", tone.text)}>
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
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Đã tiêu (no cap)
        </div>
        <div className="text-lg font-semibold tnum">
          {formatCurrency(fin.totalSpent)}
        </div>
      </div>
      <Badge variant="info">Vận hành</Badge>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "indigo";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-500"
      : tone === "warning"
      ? "text-amber-500"
      : tone === "danger"
      ? "text-rose-500"
      : tone === "indigo"
      ? "gradient-text-indigo"
      : "text-foreground";
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className={cn("text-lg font-semibold tnum mt-1", toneClass)}>
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>
      )}
    </div>
  );
}

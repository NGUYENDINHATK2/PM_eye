"use client";

import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPhase,
} from "@/types/database";
import { Briefcase, Pencil, Plus, Trash2 } from "lucide-react";
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
}: {
  initialProjects: Project[];
  phases: ProjectPhase[];
  allocations: Allocation[];
  expenses: OperatingExpense[];
  profiles: Profile[];
}) {
  const supabase = createClient();
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [status, setStatus] = useState<string>("planned");
  const [billingType, setBillingType] = useState<string>("fixed");

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  function openNew() {
    setEditing(null);
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setStatus("planned");
    setBillingType("fixed");
    setOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setColor(p.color);
    setStatus(p.status);
    setBillingType(p.billing_type ?? "fixed");
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      const { data } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (data)
        setProjects((arr) =>
          arr.map((p) => (p.id === editing.id ? (data as Project) : p))
        );
    } else {
      const { data } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();
      if (data) setProjects((arr) => [data as Project, ...arr]);
    }
    setOpen(false);
  }

  async function remove(p: Project) {
    if (
      !confirm(`Xóa dự án "${p.name}"? Tất cả phases và allocations sẽ mất.`)
    )
      return;
    await supabase.from("projects").delete().eq("id", p.id);
    setProjects((arr) => arr.filter((x) => x.id !== p.id));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dự án"
        subtitle="Theo dõi ngân sách, tiến độ và sức khỏe từng dự án."
        actions={
          <Button variant="brand" onClick={openNew}>
            <Plus /> Thêm dự án
          </Button>
        }
      />

      <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-16 text-muted-foreground">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Briefcase size={20} />
              </div>
              <div className="text-sm">Chưa có dự án nào.</div>
              <Button variant="link" onClick={openNew} className="mt-2">
                Tạo dự án đầu tiên →
              </Button>
            </CardContent>
          </Card>
        )}
        {projects.map((p) => {
          const fin = projectFinance(p, allocations, profilesById, expenses);
          const phaseCount = phases.filter(
            (ph) => ph.project_id === p.id
          ).length;

          // Active team — allocations of this project that overlap today
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
            <Card
              key={p.id}
              className="group overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 duration-200"
            >
              <div className="h-1" style={{ background: p.color }} />
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-semibold hover:underline truncate block"
                    >
                      {p.name}
                    </Link>
                    {p.client && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.client}
                      </div>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status]}>
                    {STATUS_LABEL[p.status]}
                  </Badge>
                </div>

                {/* P&L section */}
                {fin.hasRevenue ? (
                  <ProfitBlock fin={fin} />
                ) : fin.hasCap ? (
                  <CostCapBlock fin={fin} />
                ) : (
                  <NoCapBlock fin={fin} />
                )}

                {/* Team đang chạy */}
                <div className="pt-1 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <div className="eyebrow text-[10px]">Team đang chạy</div>
                    <div className="text-[11px] text-muted-foreground tnum">
                      {members.length > 0
                        ? `${members.length} người`
                        : "—"}
                    </div>
                  </div>
                  {members.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground italic">
                      Chưa phân bổ ai
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex -space-x-1.5">
                        {members.slice(0, 5).map((m) => (
                          <Tooltip key={m.profile.id}>
                            <TooltipTrigger asChild>
                              <Avatar className="w-7 h-7 ring-2 ring-card hover:scale-110 hover:z-10 transition">
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
                      <div className="text-[11px] text-muted-foreground truncate">
                        {members
                          .slice(0, 3)
                          .map(
                            (m) =>
                              `${m.profile.full_name.split(" ").slice(-1)[0]} ${formatPercent(m.percent)}`
                          )
                          .join(" · ")}
                        {members.length > 3 && ` · +${members.length - 3}`}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{phaseCount} giai đoạn</span>
                  {p.start_date && p.end_date && (
                    <span>
                      {formatDate(p.start_date)} → {formatDate(p.end_date)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    <Link href={`/projects/${p.id}`}>Chi tiết</Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                    <Trash2 className="text-rose-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
          <form onSubmit={onSubmit} className="space-y-4">
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
                  defaultValue={editing?.start_date ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Ngày kết thúc</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={editing?.end_date ?? ""}
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
            <DialogFooter>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="brand">
                Lưu
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
        <div className="text-sm font-semibold tnum">
          {formatCurrency(fin.totalSpent)}
        </div>
      </div>
      <Badge variant="info">Vận hành</Badge>
    </div>
  );
}

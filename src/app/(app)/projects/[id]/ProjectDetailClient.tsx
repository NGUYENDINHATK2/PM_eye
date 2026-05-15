"use client";

import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_GROUPS, ROLE_OPTIONS } from "@/lib/roles";
import {
  monthlyCostTimeline,
  paymentSummary,
  phaseRoleGaps,
  projectFinance,
} from "@/lib/calculations";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  humanizeSupabaseError,
  toDateInput,
} from "@/lib/utils";
import type {
  Allocation,
  OperatingExpense,
  PaymentStatus,
  Profile,
  Project,
  ProjectPayment,
  ProjectPhase,
  RequiredRole,
} from "@/types/database";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
  X,
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

export function ProjectDetailClient({
  project,
  profiles,
  phases: initialPhases,
  allocations,
  allAllocations,
  expenses,
  initialPayments,
}: {
  project: Project;
  profiles: Profile[];
  phases: ProjectPhase[];
  allocations: Allocation[];
  allAllocations: Allocation[];
  expenses: OperatingExpense[];
  initialPayments: ProjectPayment[];
}) {
  const supabase = createClient();
  const [phases, setPhases] = useState(initialPhases);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectPhase | null>(null);
  const [reqRoles, setReqRoles] = useState<RequiredRole[]>([]);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [phaseSaving, setPhaseSaving] = useState(false);

  // Payments
  const [payments, setPayments] = useState(initialPayments);
  const [payOpen, setPayOpen] = useState(false);
  const [payEditing, setPayEditing] = useState<ProjectPayment | null>(null);
  const [payStatus, setPayStatus] = useState<PaymentStatus>("planned");
  const [payError, setPayError] = useState<string | null>(null);
  const [paySaving, setPaySaving] = useState(false);

  const arSummary = useMemo(() => paymentSummary(payments), [payments]);

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const finance = useMemo(
    () => projectFinance(project, allAllocations, profilesById, expenses),
    [project, allAllocations, profilesById, expenses]
  );

  const timeline = useMemo(
    () =>
      monthlyCostTimeline(
        allAllocations,
        profilesById,
        expenses,
        6,
        project.id
      ),
    [allAllocations, profilesById, expenses, project.id]
  );

  // Team đang chạy hôm nay + chi tiết phases họ tham gia
  const team = useMemo(() => {
    const today = new Date();
    type Item = {
      profile: Profile;
      totalPercent: number;
      slots: { phaseName: string | null; percent: number; range: string }[];
    };
    const map = new Map<string, Item>();
    for (const a of allocations) {
      const aStart = new Date(a.start_date);
      const aEnd = new Date(a.end_date);
      if (today < aStart || today > aEnd) continue;
      const p = profilesById.get(a.user_id);
      if (!p) continue;
      const phaseName =
        a.phase_id
          ? phases.find((ph) => ph.id === a.phase_id)?.phase_name ?? null
          : null;
      const existing = map.get(p.id);
      const slot = {
        phaseName,
        percent: Number(a.percent),
        range: `${formatDate(a.start_date)} → ${formatDate(a.end_date)}`,
      };
      if (existing) {
        existing.totalPercent += Number(a.percent);
        existing.slots.push(slot);
      } else {
        map.set(p.id, {
          profile: p,
          totalPercent: Number(a.percent),
          slots: [slot],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.totalPercent - a.totalPercent
    );
  }, [allocations, profilesById, phases]);

  function openNew() {
    setEditing(null);
    setReqRoles([]);
    setPhaseError(null);
    setOpen(true);
  }

  function openEdit(ph: ProjectPhase) {
    setEditing(ph);
    setReqRoles(Array.isArray(ph.required_roles) ? ph.required_roles : []);
    setPhaseError(null);
    setOpen(true);
  }

  async function savePhase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhaseError(null);
    setPhaseSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      project_id: project.id,
      phase_name: fd.get("phase_name") as string,
      start_date: fd.get("start_date") as string,
      end_date: fd.get("end_date") as string,
      phase_budget: Number(fd.get("phase_budget") || 0),
      required_roles: reqRoles,
    };
    if (editing) {
      const { data, error: err } = await supabase
        .from("project_phases")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      setPhaseSaving(false);
      if (err) {
        setPhaseError(humanizeSupabaseError(err.message));
        return;
      }
      if (data) {
        setPhases((arr) =>
          arr.map((p) => (p.id === editing.id ? (data as ProjectPhase) : p))
        );
        setOpen(false);
      }
    } else {
      const { data, error: err } = await supabase
        .from("project_phases")
        .insert(payload)
        .select()
        .single();
      setPhaseSaving(false);
      if (err) {
        setPhaseError(humanizeSupabaseError(err.message));
        return;
      }
      if (data) {
        setPhases((arr) => [...arr, data as ProjectPhase]);
        setOpen(false);
      }
    }
  }

  async function removePhase(ph: ProjectPhase) {
    if (!confirm(`Xóa giai đoạn "${ph.phase_name}"?`)) return;
    await supabase.from("project_phases").delete().eq("id", ph.id);
    setPhases((arr) => arr.filter((x) => x.id !== ph.id));
  }

  function openNewPayment() {
    setPayEditing(null);
    setPayStatus("planned");
    setPayError(null);
    setPayOpen(true);
  }

  function openEditPayment(p: ProjectPayment) {
    setPayEditing(p);
    setPayStatus(p.status);
    setPayError(null);
    setPayOpen(true);
  }

  async function savePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPayError(null);
    setPaySaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      project_id: project.id,
      milestone_name: (fd.get("milestone_name") as string) || null,
      amount: Number(fd.get("amount") || 0),
      due_date: (fd.get("due_date") as string) || null,
      paid_date: (fd.get("paid_date") as string) || null,
      status: payStatus,
      note: (fd.get("note") as string) || null,
    };
    if (payEditing) {
      const { data, error: err } = await supabase
        .from("project_payments")
        .update(payload)
        .eq("id", payEditing.id)
        .select()
        .single();
      setPaySaving(false);
      if (err) {
        setPayError(humanizeSupabaseError(err.message));
        return;
      }
      if (data) {
        setPayments((arr) =>
          arr.map((x) =>
            x.id === payEditing.id ? (data as ProjectPayment) : x
          )
        );
        setPayOpen(false);
      }
    } else {
      const { data, error: err } = await supabase
        .from("project_payments")
        .insert(payload)
        .select()
        .single();
      setPaySaving(false);
      if (err) {
        setPayError(humanizeSupabaseError(err.message));
        return;
      }
      if (data) {
        setPayments((arr) => [...arr, data as ProjectPayment]);
        setPayOpen(false);
      }
    }
  }

  async function removePayment(p: ProjectPayment) {
    if (!confirm(`Xóa đợt thanh toán "${p.milestone_name ?? "?"}"?`)) return;
    await supabase.from("project_payments").delete().eq("id", p.id);
    setPayments((arr) => arr.filter((x) => x.id !== p.id));
  }

  function addRole() {
    setReqRoles((r) => {
      const used = new Set(r.map((x) => x.role));
      const next = ROLE_OPTIONS.find((o) => !used.has(o)) ?? "Other";
      return [...r, { role: next, count: 1 }];
    });
  }
  function updateRole(i: number, patch: Partial<RequiredRole>) {
    setReqRoles((r) =>
      r.map((x, idx) => {
        if (idx !== i) return x;
        const merged = { ...x, ...patch };
        // không cho phép trùng role với entry khác
        if (
          patch.role !== undefined &&
          r.some((y, yi) => yi !== i && y.role === patch.role)
        ) {
          return x; // bỏ qua nếu trùng
        }
        return merged;
      })
    );
  }
  function removeRole(i: number) {
    setReqRoles((r) => r.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-8">
      <Link
        href="/projects"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
      >
        <ArrowLeft size={12} /> Tất cả dự án
      </Link>

      <PageHeader
        title={project.name}
        subtitle={project.client ?? project.description ?? ""}
        actions={
          <div className="flex items-center gap-2">
            {!project.end_date && <Badge variant="info">Vận hành</Badge>}
            <Badge
              variant={project.status === "ongoing" ? "success" : "info"}
            >
              {project.status}
            </Badge>
          </div>
        }
      />

      {/* P&L summary — hero row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/20 blur-3xl" />
          <CardContent className="p-5 relative">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Doanh thu
            </div>
            <div className="text-2xl font-semibold mt-1 tnum gradient-text-emerald">
              {finance.hasRevenue ? formatCurrency(finance.revenue) : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {finance.hasRevenue
                ? project.billing_type === "fixed"
                  ? "Fixed-price"
                  : project.billing_type === "mm"
                  ? `Man-month · ${formatCurrency(project.mm_rate)}/MM`
                  : `T&M · ${formatCurrency(project.mm_rate)}/MM`
                : "Chưa nhập doanh thu"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Chi phí tổng
            </div>
            <div className="text-2xl font-semibold mt-1 tnum">
              {formatCurrency(finance.totalSpent)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>L: {formatCurrency(finance.laborSpent)}</span>
              <span>·</span>
              <span>V: {formatCurrency(finance.opSpent)}</span>
              {finance.consumedBefore > 0 && (
                <>
                  <span>·</span>
                  <span>Tr: {formatCurrency(finance.consumedBefore)}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div
            className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl"
            style={{
              background:
                finance.marginStatus === "loss"
                  ? "hsl(351 95% 65% / 0.25)"
                  : finance.marginStatus === "thin"
                  ? "hsl(38 92% 55% / 0.25)"
                  : finance.marginStatus === "great"
                  ? "hsl(158 64% 50% / 0.25)"
                  : "hsl(199 89% 50% / 0.2)",
            }}
          />
          <CardContent className="p-5 relative">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Lợi nhuận
            </div>
            <div
              className={`text-2xl font-semibold mt-1 tnum ${
                !finance.hasRevenue
                  ? "text-muted-foreground"
                  : finance.profit < 0
                  ? "gradient-text-rose"
                  : finance.marginStatus === "thin"
                  ? "gradient-text-amber"
                  : "gradient-text-emerald"
              }`}
            >
              {finance.hasRevenue ? formatCurrency(finance.profit) : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {finance.hasRevenue ? (
                <>
                  Margin{" "}
                  <strong>{Math.round(finance.margin * 100)}%</strong>
                  {finance.marginStatus === "loss" && " · Đang lỗ"}
                  {finance.marginStatus === "thin" && " · Mỏng"}
                  {finance.marginStatus === "ok" && " · OK"}
                  {finance.marginStatus === "great" && " · Healthy"}
                </>
              ) : (
                "Cần nhập doanh thu"
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Đã thu
            </div>
            <div className="text-2xl font-semibold mt-1 tnum text-emerald-500">
              {formatCurrency(arSummary.totalPaid)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {arSummary.totalInvoiced > 0 && (
                <>
                  Chờ thu: {formatCurrency(arSummary.totalInvoiced)}
                  {arSummary.overdueCount > 0 && (
                    <span className="text-rose-500 font-medium">
                      {" "}
                      · {arSummary.overdueCount} quá hạn
                    </span>
                  )}
                </>
              )}
              {arSummary.totalInvoiced === 0 && arSummary.totalPlanned > 0 && (
                <>Dự kiến thu: {formatCurrency(arSummary.totalPlanned)}</>
              )}
              {arSummary.totalInvoiced === 0 && arSummary.totalPlanned === 0 && (
                <>Chưa có milestone</>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chi phí dự án theo tháng</CardTitle>
          <CardDescription>
            Cộng dồn lương phân bổ + chi phí vận hành.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeline}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
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
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const labor =
                      (payload.find((p) => p.dataKey === "labor")
                        ?.value as number) ?? 0;
                    const ops =
                      (payload.find((p) => p.dataKey === "ops")
                        ?.value as number) ?? 0;
                    return (
                      <div className="rounded-lg border bg-popover px-3 py-2.5 shadow-md text-xs min-w-[140px]">
                        <div className="font-semibold mb-1.5">{label}</div>
                        <div className="flex items-center gap-3 justify-between">
                          <span className="text-muted-foreground">Lương</span>
                          <span className="tnum">{formatCurrency(labor)}</span>
                        </div>
                        <div className="flex items-center gap-3 justify-between">
                          <span className="text-muted-foreground">Vận hành</span>
                          <span className="tnum">{formatCurrency(ops)}</span>
                        </div>
                        <div className="flex items-center gap-3 justify-between pt-1 mt-1 border-t">
                          <span>Tổng</span>
                          <span className="tnum font-semibold">
                            {formatCurrency(labor + ops)}
                          </span>
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
        </CardContent>
      </Card>

      {/* Payments (khách trả nhiều đợt) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet size={16} className="text-emerald-500" />
              Thanh toán khách
            </CardTitle>
            <CardDescription>
              Các đợt thu — milestone, invoice, đã thu.
            </CardDescription>
          </div>
          <Button size="sm" variant="brand" onClick={openNewPayment}>
            <Plus /> Thêm đợt
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Chưa có đợt thanh toán nào. Thêm để tracking cashflow.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((pm) => (
                <PaymentRow
                  key={pm.id}
                  payment={pm}
                  onEdit={() => openEditPayment(pm)}
                  onDelete={() => removePayment(pm)}
                />
              ))}
              <div className="pt-3 mt-2 border-t flex items-center justify-end gap-4 text-xs">
                <span className="text-muted-foreground">
                  Tổng kế hoạch:{" "}
                  <span className="tnum font-medium text-foreground">
                    {formatCurrency(
                      arSummary.totalPlanned +
                        arSummary.totalInvoiced +
                        arSummary.totalPaid
                    )}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Đã thu:{" "}
                  <span className="tnum font-medium text-emerald-500">
                    {formatCurrency(arSummary.totalPaid)}
                  </span>
                </span>
                {arSummary.totalInvoiced > 0 && (
                  <span className="text-muted-foreground">
                    Chờ thu:{" "}
                    <span className="tnum font-medium text-amber-500">
                      {formatCurrency(arSummary.totalInvoiced)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team đang chạy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team đang chạy</CardTitle>
          <CardDescription>
            {team.length > 0
              ? `${team.length} người đang phân bổ vào dự án hôm nay`
              : "Chưa có ai phân bổ vào hôm nay"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Hãy vào{" "}
              <Link href="/allocations" className="text-indigo-500 hover:underline">
                Phân bổ
              </Link>{" "}
              để gán người vào dự án.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {team.map((m) => {
                const overloadOnProj = m.totalPercent > 1;
                return (
                  <div
                    key={m.profile.id}
                    className="flex items-start gap-3 p-3 rounded-xl border bg-card/40 hover:bg-card transition"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="text-xs">
                        {m.profile.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm truncate">
                          {m.profile.full_name}
                        </div>
                        <Badge
                          variant={overloadOnProj ? "destructive" : "brand"}
                        >
                          {formatPercent(m.totalPercent)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.profile.role}
                      </div>
                      <div className="mt-2 space-y-1">
                        {m.slots.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[11px] text-muted-foreground"
                          >
                            <span
                              className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0"
                            />
                            <span className="truncate">
                              {s.phaseName ?? "Toàn dự án"}
                            </span>
                            <span className="ml-auto tnum">
                              {formatPercent(s.percent)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Giai đoạn / Đợt</CardTitle>
            <CardDescription>
              Chia nhỏ dự án để dễ kiểm soát budget và staffing.
            </CardDescription>
          </div>
          <Button size="sm" variant="brand" onClick={openNew}>
            <Plus /> Thêm giai đoạn
          </Button>
        </CardHeader>
        <CardContent>
          {phases.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Chưa có giai đoạn nào.
            </div>
          )}
          <div className="space-y-3">
            {phases.map((ph) => {
              const gaps = phaseRoleGaps(ph, allocations, profilesById);
              const totalMissing = gaps.reduce((s, g) => s + g.missing, 0);
              const phAllocs = allocations.filter((a) => a.phase_id === ph.id);
              const today = new Date();
              const active =
                new Date(ph.start_date) <= today &&
                today <= new Date(ph.end_date);
              return (
                <div
                  key={ph.id}
                  className={
                    active
                      ? "p-4 rounded-xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.06] to-transparent transition shadow-sm"
                      : "p-4 rounded-xl border bg-card/40 transition hover:bg-card"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                        <Layers size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {ph.phase_name}
                          {active && <Badge variant="success">Đang chạy</Badge>}
                          {totalMissing > 0 && (
                            <Badge variant="destructive">
                              Thiếu {totalMissing.toFixed(1)} người
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(ph.start_date)} → {formatDate(ph.end_date)}
                          {ph.phase_budget > 0 && (
                            <span> · Budget: {formatCurrency(ph.phase_budget)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(ph)}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removePhase(ph)}
                      >
                        <Trash2 className="text-rose-500" />
                      </Button>
                    </div>
                  </div>

                  {gaps.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {gaps.map((g) => (
                        <Badge
                          key={g.role}
                          variant={g.missing > 0 ? "destructive" : "success"}
                        >
                          {g.role}: {g.assigned.toFixed(1)}/{g.required}
                          {g.missing > 0 && ` · thiếu ${g.missing.toFixed(1)}`}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {phAllocs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {phAllocs.map((a) => {
                        const p = profilesById.get(a.user_id);
                        if (!p) return null;
                        return (
                          <span
                            key={a.id}
                            className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted"
                          >
                            <Users size={10} />
                            {p.full_name} · {formatPercent(a.percent)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa giai đoạn" : "Thêm giai đoạn"}
            </DialogTitle>
            <DialogDescription>
              Khai báo thời gian và (tùy chọn) yêu cầu role để hệ thống tự cảnh
              báo nếu thiếu người.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={savePhase}
            className="space-y-4"
            key={editing?.id ?? "new-phase"}
          >
            <div className="space-y-2">
              <Label htmlFor="phase_name">Tên giai đoạn</Label>
              <Input
                id="phase_name"
                name="phase_name"
                required
                placeholder="Ví dụ: MVP, Maintenance, UAT"
                defaultValue={editing?.phase_name ?? ""}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Bắt đầu</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  required
                  defaultValue={toDateInput(editing?.start_date)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Kết thúc</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  required
                  defaultValue={toDateInput(editing?.end_date)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase_budget">Budget riêng</Label>
                <Input
                  id="phase_budget"
                  name="phase_budget"
                  type="number"
                  min="0"
                  step="1000000"
                  defaultValue={editing?.phase_budget ?? 0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Yêu cầu nhân sự</Label>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={addRole}
                >
                  <Plus /> Thêm role
                </Button>
              </div>
              <div className="space-y-2">
                {reqRoles.length === 0 && (
                  <div className="text-xs text-muted-foreground italic py-2">
                    Chưa cấu hình yêu cầu role. Hệ thống sẽ không cảnh báo thiếu
                    người.
                  </div>
                )}
                {reqRoles.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={r.role}
                      onValueChange={(v) => updateRole(i, { role: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px]">
                        {ROLE_GROUPS.map((group, gi) => (
                          <SelectGroup key={group.label}>
                            {gi > 0 && <SelectSeparator />}
                            <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {group.label}
                            </SelectLabel>
                            {group.roles.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      step="0.5"
                      className="w-24"
                      value={r.count}
                      onChange={(e) =>
                        updateRole(i, { count: Number(e.target.value) })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      type="button"
                      onClick={() => removeRole(i)}
                    >
                      <X className="text-rose-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {phaseError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2 rounded-md">
                {phaseError}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpen(false)}
                disabled={phaseSaving}
              >
                Hủy
              </Button>
              <Button type="submit" variant="brand" disabled={phaseSaving}>
                {phaseSaving ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {payEditing ? "Sửa đợt thanh toán" : "Thêm đợt thanh toán"}
            </DialogTitle>
            <DialogDescription>
              Milestone hợp đồng — invoice + payment tracking.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={savePayment}
            className="space-y-4"
            key={payEditing?.id ?? "new-pay"}
          >
            <div className="space-y-2">
              <Label htmlFor="milestone_name">Tên milestone</Label>
              <Input
                id="milestone_name"
                name="milestone_name"
                placeholder="VD: 30% ký HĐ, 30% UAT, 40% Go-live"
                defaultValue={payEditing?.milestone_name ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Số tiền (VND)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="1000000"
                  required
                  defaultValue={payEditing?.amount ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select
                  value={payStatus}
                  onValueChange={(v) => setPayStatus(v as PaymentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">📋 Kế hoạch</SelectItem>
                    <SelectItem value="invoiced">🧾 Đã xuất HĐ</SelectItem>
                    <SelectItem value="paid">✅ Đã thu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="due_date">Ngày đáo hạn</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  defaultValue={toDateInput(payEditing?.due_date)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid_date">Ngày đã thu</Label>
                <Input
                  id="paid_date"
                  name="paid_date"
                  type="date"
                  defaultValue={toDateInput(payEditing?.paid_date)}
                  disabled={payStatus !== "paid"}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Input
                id="note"
                name="note"
                placeholder="Số HĐ, số invoice, ghi chú..."
                defaultValue={payEditing?.note ?? ""}
              />
            </div>

            {payError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2 rounded-md">
                {payError}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setPayOpen(false)}
                disabled={paySaving}
              >
                Hủy
              </Button>
              <Button type="submit" variant="brand" disabled={paySaving}>
                {paySaving
                  ? "Đang lưu..."
                  : payEditing
                  ? "Lưu thay đổi"
                  : "Thêm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentRow({
  payment,
  onEdit,
  onDelete,
}: {
  payment: ProjectPayment;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const today = new Date();
  const isOverdue =
    payment.status === "invoiced" &&
    payment.due_date &&
    new Date(payment.due_date) < today;

  const tone =
    payment.status === "paid"
      ? {
          bg: "bg-emerald-500/10",
          ring: "ring-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
          icon: <CheckCircle2 size={14} />,
          label: "Đã thu",
        }
      : isOverdue
      ? {
          bg: "bg-rose-500/10",
          ring: "ring-rose-500/20",
          text: "text-rose-600 dark:text-rose-400",
          icon: <AlertCircle size={14} />,
          label: "Quá hạn",
        }
      : payment.status === "invoiced"
      ? {
          bg: "bg-amber-500/10",
          ring: "ring-amber-500/20",
          text: "text-amber-600 dark:text-amber-400",
          icon: <FileText size={14} />,
          label: "Đã xuất HĐ",
        }
      : {
          bg: "bg-muted",
          ring: "ring-border",
          text: "text-muted-foreground",
          icon: <Clock size={14} />,
          label: "Kế hoạch",
        };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card/40 hover:bg-card transition">
      <div
        className={`w-9 h-9 rounded-lg ${tone.bg} ${tone.text} ring-1 ${tone.ring} flex items-center justify-center shrink-0`}
      >
        {tone.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {payment.milestone_name ?? "(Không tên)"}
          </span>
          <Badge
            variant={
              payment.status === "paid"
                ? "success"
                : isOverdue
                ? "destructive"
                : payment.status === "invoiced"
                ? "warning"
                : "secondary"
            }
          >
            {isOverdue ? "Quá hạn" : tone.label}
          </Badge>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {payment.status === "paid" && payment.paid_date && (
            <>Đã thu: {formatDate(payment.paid_date)}</>
          )}
          {payment.status !== "paid" && payment.due_date && (
            <>Đáo hạn: {formatDate(payment.due_date)}</>
          )}
          {payment.note && <span> · {payment.note}</span>}
        </div>
      </div>
      <div className="text-base font-semibold tnum shrink-0">
        {formatCurrency(payment.amount)}
      </div>
      <Button size="icon" variant="ghost" onClick={onEdit}>
        <Pencil />
      </Button>
      <Button size="icon" variant="ghost" onClick={onDelete}>
        <Trash2 className="text-rose-500" />
      </Button>
    </div>
  );
}

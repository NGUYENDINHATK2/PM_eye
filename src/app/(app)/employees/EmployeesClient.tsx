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
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  loadStatus,
  loadStatusLabel,
  userLoadCurrentMonth,
  userLoadToday,
} from "@/lib/calculations";
import { ROLE_GROUPS } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import {
  cn,
  formatCurrency,
  formatPercent,
  humanizeSupabaseError,
  toDateInput,
} from "@/lib/utils";
import type { Allocation, Profile, SalaryHistory } from "@/types/database";
import {
  Activity,
  Flame,
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

type View = "table" | "cards";
type StatusFilter = "all" | "active" | "inactive";
type LoadFilter = "all" | "bench" | "under" | "healthy" | "over";
type Sort = "default" | "name" | "salary_desc" | "salary_asc" | "load_desc" | "load_asc";

export function EmployeesClient({
  initialProfiles,
  initialAllocations,
  initialSalaryHistory,
}: {
  initialProfiles: Profile[];
  initialAllocations: Allocation[];
  initialSalaryHistory: SalaryHistory[];
}) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [allocations] = useState(initialAllocations);
  const [salaryHistory, setSalaryHistory] = useState(initialSalaryHistory);

  // Dialog state
  const [editing, setEditing] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("BA");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [salaryInput, setSalaryInput] = useState<number>(0);

  // View + filters
  const [view, setView] = useState<View>("cards");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [loadFilter, setLoadFilter] = useState<LoadFilter>("all");
  const [sort, setSort] = useState<Sort>("default");

  const today = useMemo(() => new Date(), []);

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) set.add(p.role);
    return Array.from(set).sort();
  }, [profiles]);

  // Decorated profiles với load HÔM NAY (đồng nhất với /allocations).
  // monthLoad dùng để smart-bench detection: chỉ gọi "Bench" khi cả today
  // và cả tháng đều = 0 → tránh hiểu nhầm với người có alloc bắt đầu mai.
  const decorated = useMemo(() => {
    return profiles.map((p) => {
      const todayLoad = userLoadToday(p.id, allocations, today);
      const monthLoad = userLoadCurrentMonth(p.id, allocations, today);
      const trulyBench = todayLoad === 0 && monthLoad === 0;
      const startingSoon = todayLoad === 0 && monthLoad > 0;
      return {
        profile: p,
        load: todayLoad,
        monthLoad,
        trulyBench,
        startingSoon,
        status: loadStatus(todayLoad),
      };
    });
  }, [profiles, allocations, today]);

  const filtered = useMemo(() => {
    let list = decorated;

    if (statusFilter === "active") list = list.filter((d) => d.profile.is_active);
    if (statusFilter === "inactive")
      list = list.filter((d) => !d.profile.is_active);

    if (roleFilter !== "all")
      list = list.filter((d) => d.profile.role === roleFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.profile.full_name.toLowerCase().includes(q) ||
          d.profile.role.toLowerCase().includes(q) ||
          (d.profile.email ?? "").toLowerCase().includes(q)
      );
    }

    if (loadFilter !== "all") {
      list = list.filter((d) => {
        if (loadFilter === "bench") return d.trulyBench;
        if (loadFilter === "under") return d.load > 0 && d.load < 0.5;
        if (loadFilter === "healthy") return d.load >= 0.5 && d.load <= 1.0;
        if (loadFilter === "over") return d.load > 1.0;
        return true;
      });
    }

    if (sort !== "default") {
      list = [...list];
      if (sort === "name")
        list.sort((a, b) =>
          a.profile.full_name.localeCompare(b.profile.full_name, "vi")
        );
      else if (sort === "salary_desc")
        list.sort(
          (a, b) => Number(b.profile.base_salary) - Number(a.profile.base_salary)
        );
      else if (sort === "salary_asc")
        list.sort(
          (a, b) => Number(a.profile.base_salary) - Number(b.profile.base_salary)
        );
      else if (sort === "load_desc") list.sort((a, b) => b.load - a.load);
      else if (sort === "load_asc") list.sort((a, b) => a.load - b.load);
    }

    return list;
  }, [decorated, statusFilter, roleFilter, search, loadFilter, sort]);

  // Stats (đều dựa trên TODAY load để khớp /allocations)
  const activeList = decorated.filter((d) => d.profile.is_active);
  const totalSalary = activeList.reduce(
    (s, d) => s + Number(d.profile.base_salary),
    0
  );
  const benchCount = activeList.filter((d) => d.trulyBench).length;
  const overloadedCount = activeList.filter((d) => d.load > 1.0).length;
  const avgLoad =
    activeList.length > 0
      ? activeList.reduce((s, d) => s + d.load, 0) / activeList.length
      : 0;
  const avgSalary = activeList.length > 0 ? totalSalary / activeList.length : 0;

  // Role distribution (top 6)
  const roleDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of activeList) {
      map.set(d.profile.role, (map.get(d.profile.role) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeList]);
  const maxRoleCount = Math.max(...roleDistribution.map((r) => r.count), 1);

  function openNew() {
    setEditing(null);
    setRole("BA");
    setError(null);
    setSalaryInput(0);
    setSalaryEffectiveFrom(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setRole(p.role);
    setError(null);
    setSalaryInput(Number(p.base_salary));
    setSalaryEffectiveFrom(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  function historyCount(profileId: string): number {
    return salaryHistory.filter((h) => h.profile_id === profileId).length;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const newSalary = Number(fd.get("base_salary") || 0);
    const startDateValue =
      (fd.get("start_date") as string) ||
      new Date().toISOString().slice(0, 10);
    const payload = {
      full_name: fd.get("full_name") as string,
      email: (fd.get("email") as string) || null,
      role,
      base_salary: newSalary,
      start_date: startDateValue,
      is_active: fd.get("is_active") === "on",
    };

    if (editing) {
      const { data, error: err } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (err) {
        setSaving(false);
        setError(humanizeSupabaseError(err.message));
        return;
      }
      if (data && newSalary !== Number(editing.base_salary) && newSalary > 0) {
        const histPayload = {
          profile_id: editing.id,
          monthly_amount: newSalary,
          effective_from: salaryEffectiveFrom,
          note:
            newSalary > Number(editing.base_salary)
              ? `Tăng từ ${Number(editing.base_salary).toLocaleString("vi-VN")}`
              : `Giảm từ ${Number(editing.base_salary).toLocaleString("vi-VN")}`,
        };
        const { data: hist, error: histErr } = await supabase
          .from("salary_history")
          .insert(histPayload)
          .select()
          .single();
        if (histErr) {
          setSaving(false);
          setError(
            "Cập nhật lương thành công nhưng không ghi được lịch sử: " +
              humanizeSupabaseError(histErr.message)
          );
          return;
        }
        if (hist) setSalaryHistory((arr) => [hist as SalaryHistory, ...arr]);
      }
      setSaving(false);
      if (data) {
        setProfiles((arr) =>
          arr.map((p) => (p.id === editing.id ? (data as Profile) : p))
        );
        setOpen(false);
      }
    } else {
      const { data, error: err } = await supabase
        .from("profiles")
        .insert(payload)
        .select()
        .single();
      if (err) {
        setSaving(false);
        setError(humanizeSupabaseError(err.message));
        return;
      }
      if (data && newSalary > 0) {
        const histPayload = {
          profile_id: (data as Profile).id,
          monthly_amount: newSalary,
          effective_from: startDateValue,
          note: "Mức lương ban đầu",
        };
        const { data: hist } = await supabase
          .from("salary_history")
          .insert(histPayload)
          .select()
          .single();
        if (hist) setSalaryHistory((arr) => [hist as SalaryHistory, ...arr]);
      }
      setSaving(false);
      if (data) {
        setProfiles((arr) => [data as Profile, ...arr]);
        setOpen(false);
      }
    }
  }

  async function remove(p: Profile) {
    if (!confirm(`Xóa ${p.full_name}?`)) return;
    await supabase.from("profiles").delete().eq("id", p.id);
    setProfiles((arr) => arr.filter((x) => x.id !== p.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace · Team"
        title="Quản lý nhân sự"
        subtitle="KPI tổng + phân bố theo role + bảng/grid danh sách thành viên với tải, lương và lịch sử."
        actions={
          <Button variant="brand" onClick={openNew}>
            <UserPlus />
            Thêm người
          </Button>
        }
      />

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Active"
          value={activeList.length.toString()}
          hint={`/ ${profiles.length} tổng`}
          tone="indigo"
          icon={<Users size={14} />}
        />
        <KpiCard
          label="Quỹ lương / tháng"
          value={formatCurrency(totalSalary)}
          hint={`TB ${formatCurrency(avgSalary)} / người`}
          tone="violet"
          icon={<Wallet size={14} />}
        />
        <KpiCard
          label="Tải trung bình"
          value={formatPercent(avgLoad)}
          hint={
            avgLoad > 1
              ? "Team đang over"
              : avgLoad > 0.5
              ? "Healthy"
              : "Còn dư công"
          }
          tone={avgLoad > 1 ? "rose" : avgLoad > 0.5 ? "emerald" : "sky"}
          icon={<Activity size={14} />}
        />
        <KpiCard
          label="Đang bench"
          value={benchCount.toString()}
          hint={
            benchCount > 0
              ? `${Math.round((benchCount / Math.max(1, activeList.length)) * 100)}% team`
              : "Cả team có việc"
          }
          tone="sky"
          icon={<Sparkles size={14} />}
        />
        <KpiCard
          label="Quá tải"
          value={overloadedCount.toString()}
          hint={overloadedCount > 0 ? "Burnout risk!" : "Không có burnout"}
          tone={overloadedCount > 0 ? "rose" : "emerald"}
          icon={<Flame size={14} />}
        />
      </div>

      {/* Role distribution + toolbar grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        {/* Role distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-500" />
              Phân bố theo role
            </CardTitle>
            <CardDescription className="text-xs">
              {roleDistribution.length} role · click chip để filter
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {roleDistribution.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                Chưa có nhân sự active
              </div>
            ) : (
              <div className="space-y-2">
                {roleDistribution.map((r) => {
                  const active = roleFilter === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() =>
                        setRoleFilter(active ? "all" : r.role)
                      }
                      className={cn(
                        "w-full flex items-center gap-3 text-left group rounded-lg px-2 py-1.5 transition",
                        active ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium w-24 truncate",
                          active ? "text-primary" : "text-foreground"
                        )}
                      >
                        {r.role}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(r.count / maxRoleCount) * 100}%`,
                            background: active
                              ? "hsl(var(--primary))"
                              : "linear-gradient(90deg, hsl(var(--indigo)), hsl(var(--violet)))",
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs tnum tabular-nums w-6 text-right",
                          active ? "text-primary font-medium" : "text-muted-foreground"
                        )}
                      >
                        {r.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Toolbar + view */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Danh sách · {filtered.length} / {profiles.length}
              </div>
              {/* View toggle */}
              <div className="inline-flex rounded-lg border bg-card p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition",
                    view === "cards"
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid size={13} />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition",
                    view === "table"
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ListIcon size={13} />
                  Table
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên / role / email…"
                  className="h-9 pl-7 pr-2 text-xs bg-card"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs font-medium bg-card shadow-sm">
                  <SelectValue placeholder="Tất cả role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Tất cả role
                  </SelectItem>
                  {allRoles.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-9 w-[120px] text-xs font-medium bg-card shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">
                    Active
                  </SelectItem>
                  <SelectItem value="inactive" className="text-xs">
                    Inactive
                  </SelectItem>
                  <SelectItem value="all" className="text-xs">
                    Tất cả
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={loadFilter}
                onValueChange={(v) => setLoadFilter(v as LoadFilter)}
              >
                <SelectTrigger className="h-9 w-[130px] text-xs font-medium bg-card shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Mọi tải
                  </SelectItem>
                  <SelectItem value="bench" className="text-xs">
                    Bench (0%)
                  </SelectItem>
                  <SelectItem value="under" className="text-xs">
                    Dưới 50%
                  </SelectItem>
                  <SelectItem value="healthy" className="text-xs">
                    Healthy (50-100)
                  </SelectItem>
                  <SelectItem value="over" className="text-xs">
                    Quá tải (&gt;100)
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger className="h-9 w-[140px] text-xs font-medium bg-card shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-xs">
                    Mặc định
                  </SelectItem>
                  <SelectItem value="name" className="text-xs">
                    Tên A→Z
                  </SelectItem>
                  <SelectItem value="load_desc" className="text-xs">
                    Tải cao→thấp
                  </SelectItem>
                  <SelectItem value="load_asc" className="text-xs">
                    Tải thấp→cao
                  </SelectItem>
                  <SelectItem value="salary_desc" className="text-xs">
                    Lương cao→thấp
                  </SelectItem>
                  <SelectItem value="salary_asc" className="text-xs">
                    Lương thấp→cao
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {profiles.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={UserPlus}
              tone="emerald"
              title="Chưa có nhân sự nào"
              description="Thêm thành viên đầu tiên để bắt đầu phân bổ vào dự án và tính chi phí lương."
              action={
                <Button variant="brand" onClick={openNew}>
                  <UserPlus /> Thêm người đầu tiên
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Không có ai khớp filter — thử xoá search hoặc đổi role.
          </CardContent>
        </Card>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((d) => (
            <PersonCard
              key={d.profile.id}
              profile={d.profile}
              load={d.load}
              monthLoad={d.monthLoad}
              startingSoon={d.startingSoon}
              status={d.status}
              historyCount={historyCount(d.profile.id)}
              onEdit={() => openEdit(d.profile)}
              onDelete={() => remove(d.profile)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Tên</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Lương / tháng</TableHead>
                  <TableHead>Tải hôm nay</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="pr-6 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const p = d.profile;
                  const load = d.load;
                  const st = d.status;
                  const badgeVariant =
                    st === "critical" || st === "overloaded"
                      ? "destructive"
                      : st === "idle"
                      ? "info"
                      : st === "underused"
                      ? "warning"
                      : "success";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                              {p.full_name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{p.full_name}</div>
                            {p.email && (
                              <div className="text-xs text-muted-foreground">
                                {p.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="brand">{p.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right tnum">
                        {formatCurrency(p.base_salary)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${Math.min(100, load * 100)}%`,
                                background:
                                  load > 1
                                    ? "hsl(var(--destructive))"
                                    : load > 0.5
                                    ? "hsl(var(--emerald))"
                                    : load > 0
                                    ? "hsl(var(--sky))"
                                    : "hsl(var(--muted))",
                              }}
                            />
                          </div>
                          <span className="text-xs tnum text-muted-foreground w-9 text-right">
                            {formatPercent(load)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {!p.is_active ? (
                          <Badge variant="secondary">Off</Badge>
                        ) : d.startingSoon ? (
                          <Badge variant="info" title={`Tháng này TB ${formatPercent(d.monthLoad)}`}>
                            Sắp bắt đầu
                          </Badge>
                        ) : (
                          <Badge variant={badgeVariant}>
                            {loadStatusLabel(st)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(p)}
                          >
                            <Trash2 className="text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog (giữ nguyên) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa nhân sự" : "Thêm nhân sự"}
            </DialogTitle>
            <DialogDescription>
              Lưu thông tin lương và vị trí để hệ thống tính chi phí.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={onSubmit}
            className="space-y-4"
            key={editing?.id ?? "new-emp"}
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                defaultValue={editing?.full_name ?? ""}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editing?.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Vị trí</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {ROLE_GROUPS.map((group, gi) => (
                      <SelectGroup key={group.label}>
                        {gi > 0 && <SelectSeparator />}
                        <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {group.label}
                        </SelectLabel>
                        {group.roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 min-h-[18px]">
                  <Label htmlFor="base_salary" className="!mb-0">
                    Lương / tháng (VND)
                  </Label>
                  {editing && historyCount(editing.id) > 0 && (
                    <Badge variant="info" className="text-[9px] !py-0">
                      {historyCount(editing.id)} lần đổi
                    </Badge>
                  )}
                </div>
                <Input
                  id="base_salary"
                  name="base_salary"
                  type="number"
                  min="0"
                  step="100000"
                  required
                  value={salaryInput || ""}
                  onChange={(e) => setSalaryInput(Number(e.target.value || 0))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Ngày vào</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={
                    toDateInput(editing?.start_date) ||
                    new Date().toISOString().slice(0, 10)
                  }
                />
              </div>
            </div>

            {editing &&
              salaryInput > 0 &&
              salaryInput !== Number(editing.base_salary) && (
                <div className="rounded-xl border bg-gradient-to-br from-amber-500/[0.06] to-transparent p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3.5 rounded-full bg-amber-500" />
                    <Label className="mb-0 text-xs">
                      Mức lương mới có hiệu lực từ ngày
                    </Label>
                  </div>
                  <Input
                    type="date"
                    value={salaryEffectiveFrom}
                    onChange={(e) => setSalaryEffectiveFrom(e.target.value)}
                    required
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Chi phí lương trước ngày này vẫn dùng mức cũ (
                    {formatCurrency(editing.base_salary)}); từ ngày này trở đi
                    dùng mức mới ({formatCurrency(salaryInput)}). Lịch sử sẽ
                    được ghi lại.
                  </div>
                </div>
              )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing ? editing.is_active : true}
                className="w-4 h-4 rounded border-input accent-indigo-500"
              />
              Đang làm việc
            </label>

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

type Tone = "indigo" | "violet" | "emerald" | "rose" | "amber" | "sky";
const toneMap: Record<Tone, { bg: string; text: string; iconBg: string }> = {
  indigo: {
    bg: "bg-indigo-500/5 border-indigo-500/15",
    text: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10",
  },
  violet: {
    bg: "bg-violet-500/5 border-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-500/10",
  },
  emerald: {
    bg: "bg-emerald-500/5 border-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  rose: {
    bg: "bg-rose-500/5 border-rose-500/15",
    text: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10",
  },
  amber: {
    bg: "bg-amber-500/5 border-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
  },
  sky: {
    bg: "bg-sky-500/5 border-sky-500/15",
    text: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-500/10",
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
  const t = toneMap[tone];
  return (
    <div className={cn("rounded-xl border p-3 lg:p-4 relative overflow-hidden", t.bg)}>
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            t.iconBg,
            t.text
          )}
        >
          {icon}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <div className={cn("text-xl lg:text-2xl font-semibold tnum tracking-tight truncate", t.text)}>
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {hint}
        </div>
      )}
    </div>
  );
}

function PersonCard({
  profile,
  load,
  monthLoad,
  startingSoon,
  status,
  historyCount,
  onEdit,
  onDelete,
}: {
  profile: Profile;
  load: number;
  monthLoad: number;
  startingSoon: boolean;
  status: ReturnType<typeof loadStatus>;
  historyCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badgeVariant =
    status === "critical" || status === "overloaded"
      ? "destructive"
      : status === "idle"
      ? "info"
      : status === "underused"
      ? "warning"
      : "success";

  const loadColor =
    load > 1
      ? "hsl(var(--destructive))"
      : load > 0.5
      ? "hsl(var(--emerald))"
      : load > 0
      ? "hsl(var(--sky))"
      : "hsl(var(--muted-foreground) / 0.4)";

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 group",
        !profile.is_active && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-11 w-11 ring-2 ring-primary/15 shrink-0">
          <AvatarFallback className="text-sm bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold">
            {profile.full_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">
            {profile.full_name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="brand" className="text-[10px] py-0">
              {profile.role}
            </Badge>
            {!profile.is_active && (
              <Badge variant="secondary" className="text-[10px] py-0">
                Off
              </Badge>
            )}
          </div>
          {profile.email && (
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
              {profile.email}
            </div>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7">
            <Pencil className="!size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7">
            <Trash2 className="!size-3.5 text-rose-500" />
          </Button>
        </div>
      </div>

      {/* Load bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Tải hôm nay</span>
          {startingSoon ? (
            <Badge variant="info" className="text-[10px] py-0">
              Sắp bắt đầu · TB tháng {formatPercent(monthLoad)}
            </Badge>
          ) : (
            <Badge variant={badgeVariant} className="text-[10px] py-0 tnum">
              {formatPercent(load)} · {loadStatusLabel(status)}
            </Badge>
          )}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, load * 100)}%`,
              background: loadColor,
              boxShadow: load > 0 ? `0 0 8px ${loadColor}66` : undefined,
            }}
          />
        </div>
      </div>

      {/* Footer: salary + history */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t text-[11px]">
        <div>
          <div className="text-muted-foreground">Lương / tháng</div>
          <div className="font-semibold tnum text-sm gradient-text-indigo">
            {formatCurrency(profile.base_salary)}
          </div>
        </div>
        {historyCount > 0 && (
          <Badge variant="info" className="text-[9px] py-0">
            {historyCount} lần đổi
          </Badge>
        )}
      </div>
    </div>
  );
}

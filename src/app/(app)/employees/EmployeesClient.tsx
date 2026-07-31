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
import { useAppData } from "@/lib/hooks/useAppData";
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
  Briefcase,
  CalendarDays,
  Flame,
  LayoutGrid,
  List as ListIcon,
  Mail,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
  const { mutate, data: appData } = useAppData();
  const canViewSalary = appData?.user.canViewSalary ?? false;
  const isAdmin = appData?.user.isAdmin ?? false;
  const [profiles, setProfiles] = useState(initialProfiles);
  const [allocations, setAllocations] = useState(initialAllocations);
  const [salaryHistory, setSalaryHistory] = useState(initialSalaryHistory);

  useEffect(() => setProfiles(initialProfiles), [initialProfiles]);
  useEffect(() => setAllocations(initialAllocations), [initialAllocations]);
  useEffect(() => setSalaryHistory(initialSalaryHistory), [initialSalaryHistory]);

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
    for (const p of profiles) set.add(p.job_role);
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
      list = list.filter((d) => d.profile.job_role === roleFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.profile.full_name.toLowerCase().includes(q) ||
          d.profile.job_role.toLowerCase().includes(q) ||
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
      map.set(d.profile.job_role, (map.get(d.profile.job_role) ?? 0) + 1);
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
    setRole(p.job_role);
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
    try {
      if (editing) {
        const patchBody: Record<string, unknown> = {
          id: editing.id,
          full_name: fd.get("full_name") as string,
          email: (fd.get("email") as string) || null,
          job_role: role,
          start_date: startDateValue,
          is_active: fd.get("is_active") === "on",
        };
        if (canViewSalary) patchBody.base_salary = newSalary;

        const res = await fetch("/api/profiles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        });
        const data = await res.json();
        if (!res.ok) {
          setSaving(false);
          setError(humanizeSupabaseError(data.message || "Lỗi cập nhật"));
          return;
        }

        if (
          canViewSalary &&
          newSalary !== Number(editing.base_salary) &&
          newSalary > 0
        ) {
          const histRes = await fetch("/api/salary-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile_id: editing.id,
              monthly_amount: newSalary,
              effective_from: salaryEffectiveFrom,
              note:
                newSalary > Number(editing.base_salary)
                  ? `Tăng từ ${Number(editing.base_salary).toLocaleString("vi-VN")}`
                  : `Giảm từ ${Number(editing.base_salary).toLocaleString("vi-VN")}`,
            }),
          });
          if (histRes.ok) {
            const hist = (await histRes.json()) as SalaryHistory;
            setSalaryHistory((arr) => [hist, ...arr]);
            mutate((prev) => ({
              ...prev,
              salaryHistory: [hist, ...prev.salaryHistory],
            }));
          }
        }

        const next = data as Profile;
        setProfiles((arr) => arr.map((p) => (p.id === editing.id ? next : p)));
        mutate((prev) => ({
          ...prev,
          profiles: prev.profiles.map((p) => (p.id === editing.id ? next : p)),
        }));
        toast.success(`Đã cập nhật ${next.full_name}`);
        setOpen(false);
      } else {
        // Tạo nhân sự = tạo auth user — chỉ admin, qua /api/admin/users
        if (!isAdmin) {
          setSaving(false);
          setError("Chỉ admin được tạo nhân sự mới. Vào Tài khoản để cấp acc.");
          return;
        }
        const password = String(fd.get("password") || "");
        if (password.length < 6) {
          setSaving(false);
          setError("Cần mật khẩu ≥ 6 ký tự để tạo tài khoản đăng nhập.");
          return;
        }
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: fd.get("email"),
            password,
            full_name: fd.get("full_name"),
            job_role: role,
            app_role: "member",
            base_salary: canViewSalary ? newSalary : 0,
            start_date: startDateValue,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setSaving(false);
          setError(humanizeSupabaseError(json.message || "Không tạo được"));
          return;
        }
        const next = json.user as Profile;
        setProfiles((arr) => [next, ...arr]);
        mutate((prev) => ({
          ...prev,
          profiles: [next, ...prev.profiles],
        }));
        toast.success(`Đã thêm ${next.full_name}`);
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Profile) {
    if (!confirm(`Xóa ${p.full_name}?`)) return;
    const { error: err } = await supabase.from("profiles").delete().eq("id", p.id);
    if (err) {
      toast.error(humanizeSupabaseError(err.message));
      return;
    }
    setProfiles((arr) => arr.filter((x) => x.id !== p.id));
    mutate((prev) => ({
      ...prev,
      profiles: prev.profiles.filter((x) => x.id !== p.id),
    }));
    toast.success(`Đã xóa ${p.full_name}`);
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
              <TrendingUp size={14} className="text-teal-500" />
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
                  {canViewSalary && (
                    <TableHead className="text-right">Lương / tháng</TableHead>
                  )}
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
                            <AvatarFallback className="text-xs bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
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
                        <Badge variant="brand">{p.job_role}</Badge>
                      </TableCell>
                      {canViewSalary && (
                        <TableCell className="text-right tnum">
                          {formatCurrency(p.base_salary)}
                        </TableCell>
                      )}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  "bg-gradient-to-br from-teal-500/20 via-sky-500/10 to-transparent",
                  "ring-1 ring-teal-500/25 text-teal-700 dark:text-teal-300",
                  "font-[family-name:var(--font-display)] text-base font-semibold"
                )}
              >
                {(editing?.full_name || "NS")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("") || "NS"}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-teal-500 ring-2 ring-card" />
              </div>
              <div className="min-w-0 pt-0.5">
                <DialogTitle>
                  {editing ? "Sửa nhân sự" : "Thêm nhân sự"}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {editing
                    ? "Chỉnh hồ sơ, vị trí và trạng thái làm việc."
                    : "Tạo tài khoản đăng nhập (member) + hồ sơ. Đổi quyền tại Tài khoản."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={onSubmit}
            className="space-y-5 px-6 py-5"
            key={editing?.id ?? "new-emp"}
          >
            <div className="space-y-4 rounded-2xl bg-muted/35 p-4 ring-1 ring-border/50">
              <div className="space-y-2">
                <Label htmlFor="full_name">Họ và tên</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    placeholder="Nguyễn Văn A"
                    defaultValue={editing?.full_name ?? ""}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required={!editing}
                      placeholder="name@company.com"
                      defaultValue={editing?.email ?? ""}
                      disabled={!!editing}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vị trí</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="pl-10 relative">
                      <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
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

              {!editing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu đăng nhập</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {canViewSalary && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="base_salary">Lương / tháng</Label>
                      {editing && historyCount(editing.id) > 0 && (
                        <Badge variant="info" className="text-[9px] !py-0">
                          {historyCount(editing.id)} lần đổi
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        id="base_salary"
                        name="base_salary"
                        type="number"
                        min="0"
                        step="100000"
                        required
                        value={salaryInput || ""}
                        onChange={(e) =>
                          setSalaryInput(Number(e.target.value || 0))
                        }
                        className="pl-10 pr-14"
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold tracking-wide text-muted-foreground">
                        VND
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="start_date">Ngày vào</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      defaultValue={
                        toDateInput(editing?.start_date) ||
                        new Date().toISOString().slice(0, 10)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {canViewSalary &&
              editing &&
              salaryInput > 0 &&
              salaryInput !== Number(editing.base_salary) && (
                <div className="space-y-3 rounded-2xl bg-amber-500/[0.07] p-4 ring-1 ring-amber-500/20">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <Label className="normal-case tracking-normal text-amber-800 dark:text-amber-200">
                      Mức mới có hiệu lực từ
                    </Label>
                  </div>
                  <Input
                    type="date"
                    value={salaryEffectiveFrom}
                    onChange={(e) => setSalaryEffectiveFrom(e.target.value)}
                    required
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Trước ngày này giữ{" "}
                    <span className="font-medium text-foreground tnum">
                      {formatCurrency(editing.base_salary)}
                    </span>
                    ; từ ngày này dùng{" "}
                    <span className="font-medium text-foreground tnum">
                      {formatCurrency(salaryInput)}
                    </span>
                    . Lịch sử được ghi lại.
                  </p>
                </div>
              )}

            <label
              className={cn(
                "flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3.5",
                "bg-background ring-1 ring-border/70 transition-colors",
                "hover:ring-primary/30 hover:bg-muted/40"
              )}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">Đang làm việc</div>
                <div className="text-xs text-muted-foreground">
                  Tắt khi nhân sự nghỉ / tạm ngưng
                </div>
              </div>
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing ? editing.is_active : true}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full bg-muted transition-colors",
                  "peer-checked:bg-teal-500",
                  "after:absolute after:left-1 after:top-1 after:h-5 after:w-5",
                  "after:rounded-full after:bg-white after:shadow-sm after:transition-transform",
                  "peer-checked:after:translate-x-5"
                )}
              />
            </label>

            {error && (
              <div className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 ring-1 ring-rose-500/20 dark:text-rose-400">
                {error}
              </div>
            )}

            <DialogFooter className="-mx-6 -mb-5 mt-1 border-t-0 bg-transparent px-0 pb-0 pt-1 sm:justify-between">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded-xl"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={saving}
                className="min-w-[7.5rem] rounded-xl"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
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
    bg: "bg-teal-500/5 border-teal-500/15",
    text: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-500/10",
  },
  violet: {
    bg: "bg-cyan-500/5 border-cyan-500/15",
    text: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10",
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
          <AvatarFallback className="text-sm bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-semibold">
            {profile.full_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">
            {profile.full_name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="brand" className="text-[10px] py-0">
              {profile.job_role}
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

      {/* Footer: salary + history — chỉ khi admin (base_salary đã strip = 0 cho non-admin) */}
      {Number(profile.base_salary) > 0 && (
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
      )}
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/PageHeader";
import { PowerMeter } from "@/components/PowerMeter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Field,
  FieldControl,
  FieldGrid,
  FieldLabelRow,
} from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  LEVEL_OPTIONS,
  clampPower,
  defaultPowerForLevel,
  isDevLevel,
} from "@/lib/levels";
import {
  formatEfficiencyScore,
  personEfficiency,
  type EfficiencyResult,
} from "@/lib/power-salary";
import { ROLE_GROUPS, ROLE_OPTIONS } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import {
  cn,
  formatCurrency,
  formatPercent,
  humanizeSupabaseError,
  toDateInput,
} from "@/lib/utils";
import type {
  Allocation,
  DevLevel,
  Profile,
  SalaryHistory,
} from "@/types/database";
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
type Sort =
  | "default"
  | "name"
  | "salary_desc"
  | "salary_asc"
  | "load_desc"
  | "load_asc"
  | "power_desc"
  | "power_asc"
  | "value_desc"
  | "value_asc";

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

  const teamByUserId = useMemo(() => {
    const teams = appData?.teams ?? [];
    const members = appData?.teamMembers ?? [];
    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const map = new Map<string, { name: string; color: string }>();
    for (const m of members) {
      const t = teamsById.get(m.team_id);
      if (t) map.set(m.user_id, { name: t.name, color: t.color });
    }
    return map;
  }, [appData?.teams, appData?.teamMembers]);

  useEffect(() => setProfiles(initialProfiles), [initialProfiles]);
  useEffect(() => setAllocations(initialAllocations), [initialAllocations]);
  useEffect(() => setSalaryHistory(initialSalaryHistory), [initialSalaryHistory]);

  // Dialog state
  const [editing, setEditing] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("BA");
  const [level, setLevel] = useState<DevLevel>("Junior");
  /** Draft text — gõ tự do, chỉ clamp lúc blur/submit. */
  const [powerScore, setPowerScore] = useState("50");
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
      const efficiency = personEfficiency(
        Number(p.power_score) || 0,
        Number(p.base_salary) || 0,
        p.level
      );
      return {
        profile: p,
        load: todayLoad,
        monthLoad,
        trulyBench,
        startingSoon,
        status: loadStatus(todayLoad),
        efficiency,
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
      else if (sort === "power_desc")
        list.sort(
          (a, b) => Number(b.profile.power_score) - Number(a.profile.power_score)
        );
      else if (sort === "power_asc")
        list.sort(
          (a, b) => Number(a.profile.power_score) - Number(b.profile.power_score)
        );
      else if (sort === "value_desc")
        list.sort(
          (a, b) => (b.efficiency.score ?? -1) - (a.efficiency.score ?? -1)
        );
      else if (sort === "value_asc")
        list.sort(
          (a, b) => (a.efficiency.score ?? 999) - (b.efficiency.score ?? 999)
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
  const avgPower =
    activeList.length > 0
      ? activeList.reduce((s, d) => s + Number(d.profile.power_score || 0), 0) /
        activeList.length
      : 0;
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
    setLevel("Junior");
    setPowerScore(String(defaultPowerForLevel("Junior")));
    setError(null);
    setSalaryInput(0);
    setSalaryEffectiveFrom(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setRole(
      (ROLE_OPTIONS as readonly string[]).includes(p.job_role)
        ? p.job_role
        : "Other"
    );
    const lv = isDevLevel(p.level) ? p.level : "Junior";
    setLevel(lv);
    setPowerScore(
      String(
        Number(p.power_score) > 0
          ? clampPower(Number(p.power_score))
          : defaultPowerForLevel(lv)
      )
    );
    setError(null);
    setSalaryInput(Number(p.base_salary));
    setSalaryEffectiveFrom(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  function onLevelChange(next: string) {
    if (!isDevLevel(next)) return;
    setLevel(next);
    // Chỉ auto-fill nếu đang khớp default của level cũ hoặc tạo mới
    const prevDefault = defaultPowerForLevel(level);
    if (!editing || Number(powerScore) === prevDefault) {
      setPowerScore(String(defaultPowerForLevel(next)));
    }
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
          level,
          power_score: clampPower(Number(powerScore) || 50),
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
            level,
            power_score: clampPower(Number(powerScore) || 50),
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
        subtitle="Chức danh, level, lực chiến và tải — hỗ trợ phân bổ đúng người đúng chỗ."
        actions={
          <Button variant="brand" onClick={openNew}>
            <UserPlus />
            Thêm người
          </Button>
        }
      />

      {/* Hero KPIs */}
      <div
        className={
          canViewSalary
            ? "grid grid-cols-2 gap-3 lg:grid-cols-6"
            : "grid grid-cols-2 gap-3 lg:grid-cols-5"
        }
      >
        <KpiCard
          label="Active"
          value={activeList.length.toString()}
          hint={`/ ${profiles.length} tổng`}
          tone="indigo"
          icon={<Users size={14} />}
        />
        <KpiCard
          label="Lực chiến TB"
          value={Math.round(avgPower).toString()}
          hint="Thang điểm 1–100"
          tone="amber"
          icon={<Flame size={14} />}
        />
        {canViewSalary && (
          <KpiCard
            label="Quỹ lương / tháng"
            value={formatCurrency(totalSalary)}
            hint={`TB ${formatCurrency(avgSalary)} / người`}
            tone="violet"
            icon={<Wallet size={14} />}
          />
        )}
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        {/* Role distribution */}
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
          <div className="border-b border-border/60 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={14} className="text-teal-500" />
              Phân bố theo role
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {roleDistribution.length} role · click để filter
            </div>
          </div>
          <div className="px-4 py-3 sm:px-5">
            {roleDistribution.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Chưa có nhân sự active
              </div>
            ) : (
              <div className="space-y-1.5">
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
                        "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                        active
                          ? "bg-teal-500/10 ring-1 ring-teal-500/20"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "w-24 truncate text-xs font-medium",
                          active
                            ? "text-teal-700 dark:text-teal-300"
                            : "text-foreground"
                        )}
                      >
                        {r.role}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            active
                              ? "bg-teal-500"
                              : "bg-gradient-to-r from-teal-500/70 to-cyan-500/70"
                          )}
                          style={{
                            width: `${(r.count / maxRoleCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "tnum w-6 text-right text-xs tabular-nums",
                          active
                            ? "font-medium text-teal-700 dark:text-teal-300"
                            : "text-muted-foreground"
                        )}
                      >
                        {r.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar + view */}
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
          <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <div className="text-sm font-semibold">Danh sách nhân sự</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {filtered.length} / {profiles.length}
                {roleFilter !== "all" ? ` · lọc ${roleFilter}` : ""}
              </div>
            </div>
            <div className="inline-flex rounded-xl bg-muted/50 p-0.5 ring-1 ring-border/50">
              <button
                type="button"
                onClick={() => setView("cards")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition",
                  view === "cards"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid size={14} />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition",
                  view === "table"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ListIcon size={14} />
                Table
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên / role / email…"
                className="h-10 pl-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-10 w-[140px]">
                <SelectValue placeholder="Tất cả role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả role</SelectItem>
                {allRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-10 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">Tất cả</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={loadFilter}
              onValueChange={(v) => setLoadFilter(v as LoadFilter)}
            >
              <SelectTrigger className="h-10 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi tải</SelectItem>
                <SelectItem value="bench">Bench (0%)</SelectItem>
                <SelectItem value="under">Dưới 50%</SelectItem>
                <SelectItem value="healthy">Healthy (50-100)</SelectItem>
                <SelectItem value="over">Quá tải (&gt;100)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="h-10 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Mặc định</SelectItem>
                <SelectItem value="name">Tên A→Z</SelectItem>
                <SelectItem value="power_desc">Lực chiến cao→thấp</SelectItem>
                <SelectItem value="power_asc">Lực chiến thấp→cao</SelectItem>
                <SelectItem value="load_desc">Tải cao→thấp</SelectItem>
                <SelectItem value="load_asc">Tải thấp→cao</SelectItem>
                {canViewSalary && (
                  <>
                    <SelectItem value="salary_desc">Lương cao→thấp</SelectItem>
                    <SelectItem value="salary_asc">Lương thấp→cao</SelectItem>
                    <SelectItem value="value_desc">LC/lương cao→thấp</SelectItem>
                    <SelectItem value="value_asc">LC/lương thấp→cao</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* List */}
      {profiles.length === 0 ? (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
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
        </div>
      ) : filtered.length === 0 ? (
        <div className="overflow-hidden rounded-2xl bg-card px-4 py-14 text-center ring-1 ring-border/70">
          <p className="text-sm text-muted-foreground">
            Không có ai khớp filter —{" "}
            <button
              type="button"
              className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("active");
                setLoadFilter("all");
              }}
            >
              Xóa lọc
            </button>
          </p>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((d) => (
            <PersonCard
              key={d.profile.id}
              profile={d.profile}
              load={d.load}
              monthLoad={d.monthLoad}
              startingSoon={d.startingSoon}
              status={d.status}
              historyCount={historyCount(d.profile.id)}
              canViewSalary={canViewSalary}
              team={teamByUserId.get(d.profile.id) ?? null}
              level={d.profile.level}
              power={Number(d.profile.power_score) || 0}
              efficiency={d.efficiency}
              onEdit={() => openEdit(d.profile)}
              onDelete={() => remove(d.profile)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Tên</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Level / LC</TableHead>
                <TableHead>Team</TableHead>
                {canViewSalary && (
                  <TableHead className="text-right">Lương</TableHead>
                )}
                {canViewSalary && (
                  <TableHead className="text-right">LC/lương</TableHead>
                )}
                <TableHead>Tải hôm nay</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-16 pr-5"></TableHead>
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
                  <TableRow key={p.id} className="group hover:bg-muted/35">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-2xl">
                          <AvatarFallback className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-xs text-white">
                            {p.full_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium leading-none">
                            {p.full_name}
                          </div>
                          {p.email && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {p.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="brand">{p.job_role}</Badge>
                    </TableCell>
                    <TableCell>
                      <PowerMeter
                        level={p.level}
                        power={Number(p.power_score) || 0}
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      {teamByUserId.get(p.id) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background: teamByUserId.get(p.id)!.color,
                            }}
                          />
                          {teamByUserId.get(p.id)!.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {canViewSalary && (
                      <TableCell className="tnum text-right tabular-nums">
                        {formatCurrency(p.base_salary)}
                      </TableCell>
                    )}
                    {canViewSalary && (
                      <TableCell className="tnum text-right text-sm font-medium tabular-nums">
                        {formatEfficiencyScore(d.efficiency.score)}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
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
                        <span className="tnum w-9 text-right text-xs tabular-nums text-muted-foreground">
                          {formatPercent(load)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!p.is_active ? (
                        <Badge variant="secondary">Off</Badge>
                      ) : d.startingSoon ? (
                        <Badge
                          variant="info"
                          title={`Tháng này TB ${formatPercent(d.monthLoad)}`}
                        >
                          Sắp bắt đầu
                        </Badge>
                      ) : (
                        <Badge variant={badgeVariant}>
                          {loadStatusLabel(st)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-70 sm:group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => remove(p)}
                        >
                          <Trash2 size={15} className="text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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

          <form onSubmit={onSubmit} key={editing?.id ?? "new-emp"}>
            <DialogBody>
              <div className="flex flex-col gap-4 rounded-2xl bg-muted/30 p-5 ring-1 ring-border/40 sm:p-6">
                <Field>
                  <FieldLabelRow>
                    <Label htmlFor="full_name">Họ và tên</Label>
                  </FieldLabelRow>
                  <FieldControl icon={<User />}>
                    <Input
                      id="full_name"
                      name="full_name"
                      required
                      placeholder="Nguyễn Văn A"
                      defaultValue={editing?.full_name ?? ""}
                      className="h-11 pl-10"
                    />
                  </FieldControl>
                </Field>

                <FieldGrid>
                  <Field>
                    <FieldLabelRow>
                      <Label htmlFor="email">Email</Label>
                    </FieldLabelRow>
                    <FieldControl icon={<Mail />}>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required={!editing}
                        placeholder="name@company.com"
                        defaultValue={editing?.email ?? ""}
                        disabled={!!editing}
                        className="h-11 pl-10"
                      />
                    </FieldControl>
                  </Field>
                  <Field>
                    <FieldLabelRow>
                      <Label>Vị trí</Label>
                    </FieldLabelRow>
                    <FieldControl icon={<Briefcase />}>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="h-11 pl-10">
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
                    </FieldControl>
                  </Field>
                </FieldGrid>

                <FieldGrid>
                  <Field>
                    <FieldLabelRow>
                      <Label>Level</Label>
                    </FieldLabelRow>
                    <Select value={level} onValueChange={onLevelChange}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((lv) => (
                          <SelectItem key={lv} value={lv}>
                            {lv}
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              · LC {defaultPowerForLevel(lv)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabelRow>
                      <Label htmlFor="power_score">Lực chiến</Label>
                      <button
                        type="button"
                        className="shrink-0 text-[10px] font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                        onClick={() =>
                          setPowerScore(
                            String(defaultPowerForLevel(level))
                          )
                        }
                      >
                        Reset theo level
                      </button>
                    </FieldLabelRow>
                    <FieldControl icon={<Flame />} suffix="/100">
                      <Input
                        id="power_score"
                        name="power_score"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="1–100"
                        value={powerScore}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 3);
                          setPowerScore(digits);
                        }}
                        onBlur={() => {
                          setPowerScore(
                            String(clampPower(Number(powerScore) || 50))
                          );
                        }}
                        className="h-11 pl-10 pr-14"
                      />
                      {/* Thanh trong input — không làm lệch chiều cao hàng */}
                      <div className="pointer-events-none absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-muted/80">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Number(powerScore) || 0)}%`,
                            background:
                              Number(powerScore) >= 70
                                ? "#f59e0b"
                                : Number(powerScore) >= 40
                                  ? "#14b8a6"
                                  : "#94a3b8",
                          }}
                        />
                      </div>
                    </FieldControl>
                  </Field>
                </FieldGrid>

                {!editing && (
                  <Field>
                    <FieldLabelRow>
                      <Label htmlFor="password">Mật khẩu đăng nhập</Label>
                    </FieldLabelRow>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      minLength={6}
                      required
                      autoComplete="new-password"
                      placeholder="Tối thiểu 6 ký tự"
                      className="h-11"
                    />
                  </Field>
                )}

                <FieldGrid>
                  {canViewSalary && (
                    <Field>
                      <FieldLabelRow>
                        <Label htmlFor="base_salary">Lương / tháng</Label>
                        {editing && historyCount(editing.id) > 0 ? (
                          <Badge variant="info" className="text-[9px] !py-0">
                            {historyCount(editing.id)} lần đổi
                          </Badge>
                        ) : null}
                      </FieldLabelRow>
                      <FieldControl icon={<Wallet />} suffix="VND">
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
                          className="h-11 pl-10 pr-14"
                        />
                      </FieldControl>
                    </Field>
                  )}
                  <Field>
                    <FieldLabelRow>
                      <Label htmlFor="start_date">Ngày vào</Label>
                    </FieldLabelRow>
                    <FieldControl icon={<CalendarDays />}>
                      <DatePicker
                        id="start_date"
                        name="start_date"
                        defaultValue={
                          toDateInput(editing?.start_date) ||
                          new Date().toISOString().slice(0, 10)
                        }
                        showIcon={false}
                        className="h-11 pl-10"
                      />
                    </FieldControl>
                  </Field>
                </FieldGrid>
              </div>

              {canViewSalary &&
                editing &&
                salaryInput > 0 &&
                salaryInput !== Number(editing.base_salary) && (
                  <div className="flex flex-col gap-3 rounded-2xl bg-amber-500/[0.07] p-5 ring-1 ring-amber-500/20">
                    <div className="flex h-4 items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <Label className="normal-case tracking-normal text-amber-800 dark:text-amber-200">
                        Mức mới có hiệu lực từ
                      </Label>
                    </div>
                    <DatePicker
                      value={salaryEffectiveFrom}
                      onChange={setSalaryEffectiveFrom}
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
                  "flex min-h-[3.5rem] cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-3.5",
                  "bg-muted/30 ring-1 ring-border/50 transition-colors",
                  "hover:bg-muted/45 hover:ring-primary/25"
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-none">
                    Đang làm việc
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">
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
              <Button
                type="submit"
                variant="brand"
                disabled={saving}
                className="min-w-[7.5rem]"
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
const toneMap: Record<Tone, { gradient: string; accent: string }> = {
  indigo: {
    gradient: "from-teal-500/15 to-transparent",
    accent:
      "from-teal-500/15 to-transparent text-teal-700 dark:text-teal-300 ring-teal-500/20",
  },
  violet: {
    gradient: "from-cyan-500/15 to-transparent",
    accent:
      "from-cyan-500/15 to-transparent text-cyan-700 dark:text-cyan-300 ring-cyan-500/20",
  },
  emerald: {
    gradient: "from-emerald-500/15 to-transparent",
    accent:
      "from-emerald-500/15 to-transparent text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
  },
  rose: {
    gradient: "from-rose-500/15 to-transparent",
    accent:
      "from-rose-500/15 to-transparent text-rose-700 dark:text-rose-300 ring-rose-500/20",
  },
  amber: {
    gradient: "from-amber-500/15 to-transparent",
    accent:
      "from-amber-500/15 to-transparent text-amber-700 dark:text-amber-300 ring-amber-500/20",
  },
  sky: {
    gradient: "from-sky-500/15 to-transparent",
    accent:
      "from-sky-500/15 to-transparent text-sky-700 dark:text-sky-300 ring-sky-500/20",
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
    <div className="group relative overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/25">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
          t.gradient
        )}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/70 ring-1 bg-gradient-to-br",
              t.accent
            )}
          >
            {icon}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="font-display mt-3 truncate text-xl font-semibold tracking-tight tnum lg:text-2xl">
          {value}
        </div>
        {hint && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {hint}
          </div>
        )}
      </div>
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
  canViewSalary,
  team,
  level,
  power,
  efficiency,
  onEdit,
  onDelete,
}: {
  profile: Profile;
  load: number;
  monthLoad: number;
  startingSoon: boolean;
  status: ReturnType<typeof loadStatus>;
  historyCount: number;
  canViewSalary: boolean;
  team: { name: string; color: string } | null;
  level?: string | null;
  power: number;
  efficiency: EfficiencyResult;
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
        "group relative rounded-2xl bg-card p-4 ring-1 ring-border/70 transition-all",
        "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/25",
        !profile.is_active && "opacity-60"
      )}
    >
      <div className="mb-3.5 flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0 rounded-2xl ring-2 ring-border/40">
          <AvatarFallback className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-semibold text-white">
            {profile.full_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-none">
            {profile.full_name}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="brand" className="py-0 text-[10px]">
              {profile.job_role}
            </Badge>
            {team && (
              <Badge
                variant="secondary"
                className="gap-1 py-0 text-[10px]"
                style={{ borderColor: `${team.color}55` }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: team.color }}
                />
                {team.name}
              </Badge>
            )}
            {!profile.is_active && (
              <Badge variant="secondary" className="py-0 text-[10px]">
                Off
              </Badge>
            )}
          </div>
          <div className="mt-2">
            <PowerMeter level={level} power={power} />
          </div>
          {profile.email && (
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {profile.email}
            </div>
          )}
        </div>
        <div className="flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8"
          >
            <Pencil className="!size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8"
          >
            <Trash2 className="!size-3.5 text-rose-500" />
          </Button>
        </div>
      </div>

      {/* Load bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Tải hôm nay</span>
          {startingSoon ? (
            <Badge variant="info" className="py-0 text-[10px]">
              Sắp bắt đầu · TB tháng {formatPercent(monthLoad)}
            </Badge>
          ) : (
            <Badge variant={badgeVariant} className="tnum py-0 text-[10px] tabular-nums">
              {formatPercent(load)} · {loadStatusLabel(status)}
            </Badge>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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

      {/* Footer: lương + hiệu suất — chỉ admin */}
      {canViewSalary && (
        <div className="mt-3.5 flex items-end justify-between gap-2 border-t border-border/60 pt-3.5 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              Lương
              {historyCount > 0 && (
                <span className="text-[10px] opacity-70">· {historyCount}</span>
              )}
            </div>
            <div className="tnum text-sm font-semibold tabular-nums text-teal-700 dark:text-teal-300">
              {Number(profile.base_salary) > 0
                ? formatCurrency(profile.base_salary)
                : "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground">LC/lương</div>
            <div className="tnum text-sm font-semibold tabular-nums">
              {formatEfficiencyScore(efficiency.score)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

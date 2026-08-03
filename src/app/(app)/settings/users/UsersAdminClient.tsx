"use client";

import { PageHeader } from "@/components/PageHeader";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldControl, FieldGrid } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEVEL_OPTIONS,
  clampPower,
  defaultPowerForLevel,
  isDevLevel,
} from "@/lib/levels";
import { ROLE_GROUPS } from "@/lib/roles";
import { APP_ROLES, roleLabel } from "@/lib/rbac";
import type { AppRole, DevLevel } from "@/types/database";
import { cn, formatCurrency, humanizeSupabaseError } from "@/lib/utils";
import {
  Briefcase,
  CalendarDays,
  Crown,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string;
  job_role: string;
  app_role: AppRole;
  level: DevLevel;
  power_score: number;
  is_active: boolean;
  base_salary: number;
  start_date: string;
};

export function UsersAdminClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [appRole, setAppRole] = useState<AppRole>("member");
  const [jobRole, setJobRole] = useState("BA");
  const [level, setLevel] = useState<DevLevel>("Junior");
  /** Draft text — gõ tự do, chỉ clamp lúc blur/submit. */
  const [powerScore, setPowerScore] = useState("50");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Không tải được danh sách user");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { users: UserRow[] };
    setUsers(json.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setAppRole("member");
    setJobRole("BA");
    setLevel("Junior");
    setPowerScore(String(defaultPowerForLevel("Junior")));
    setError(null);
    setOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setAppRole(u.app_role);
    setJobRole(u.job_role);
    const lv = isDevLevel(u.level) ? u.level : "Junior";
    setLevel(lv);
    setPowerScore(
      String(
        Number(u.power_score) > 0
          ? clampPower(Number(u.power_score))
          : defaultPowerForLevel(lv)
      )
    );
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    try {
      if (editing) {
        const body: Record<string, unknown> = {
          full_name: fd.get("full_name"),
          job_role: jobRole,
          app_role: appRole,
          level,
          power_score: clampPower(Number(powerScore) || 50),
          is_active: fd.get("is_active") === "on",
          base_salary: Number(fd.get("base_salary") || 0),
        };
        const pwd = String(fd.get("password") || "");
        if (pwd) body.password = pwd;

        const res = await fetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Cập nhật thất bại");
        toast.success("Đã cập nhật tài khoản");
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: fd.get("email"),
            password: fd.get("password"),
            full_name: fd.get("full_name"),
            job_role: jobRole,
            app_role: appRole,
            level,
            power_score: clampPower(Number(powerScore) || 50),
            base_salary: Number(fd.get("base_salary") || 0),
            start_date: fd.get("start_date") || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Tạo thất bại");
        toast.success("Đã tạo tài khoản");
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(
        humanizeSupabaseError(
          err instanceof Error ? err.message : "Lỗi không xác định"
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`Xóa tài khoản ${u.full_name} (${u.email})?`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.message || "Không xóa được");
      return;
    }
    toast.success("Đã xóa");
    await load();
  }

  const counts = useMemo(() => {
    const base = { admin: 0, manager: 0, pm: 0, member: 0, active: 0 };
    for (const u of users) {
      base[u.app_role] += 1;
      if (u.is_active) base.active += 1;
    }
    return base;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.app_role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        u.job_role.toLowerCase().includes(q) ||
        roleLabel(u.app_role).toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const roleCards = [
    {
      role: "admin" as const,
      title: "Admin",
      desc: "Full quyền · xem lương",
      icon: Crown,
      accent: "from-rose-500/15 to-transparent text-rose-600 dark:text-rose-400 ring-rose-500/20",
    },
    {
      role: "manager" as const,
      title: "Quản lý",
      desc: "All dự án · không lương",
      icon: Shield,
      accent: "from-teal-500/15 to-transparent text-teal-700 dark:text-teal-300 ring-teal-500/20",
    },
    {
      role: "pm" as const,
      title: "PM",
      desc: "Dự án mình phụ trách",
      icon: Briefcase,
      accent: "from-sky-500/15 to-transparent text-sky-700 dark:text-sky-300 ring-sky-500/20",
    },
    {
      role: "member" as const,
      title: "Member",
      desc: "Dự án đang làm",
      icon: Users,
      accent: "from-slate-500/10 to-transparent text-slate-600 dark:text-slate-300 ring-border/60",
    },
  ];

  function initials(name: string) {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "?"
    );
  }

  function roleBadgeVariant(role: AppRole) {
    if (role === "admin") return "destructive" as const;
    if (role === "manager") return "brand" as const;
    if (role === "pm") return "info" as const;
    return "secondary" as const;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Access"
        title="Tài khoản & phân quyền"
        subtitle="Cấp acc và quyền hệ thống. Hồ sơ HR / lương chi tiết quản ở Nhân sự."
        actions={
          <Button variant="brand" onClick={openNew} className="shadow-sm">
            <Plus size={16} /> Thêm tài khoản
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {roleCards.map((card) => {
          const Icon = card.icon;
          const active = roleFilter === card.role;
          const count = counts[card.role];
          return (
            <button
              key={card.role}
              type="button"
              onClick={() =>
                setRoleFilter(active ? "all" : card.role)
              }
              className={cn(
                "group relative overflow-hidden rounded-2xl p-4 text-left transition-all",
                "bg-card ring-1 ring-border/70",
                "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/25",
                active && "ring-2 ring-primary/40 shadow-md"
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                  card.accent.split(" ").slice(0, 2).join(" ")
                )}
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 bg-background/70",
                      card.accent
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="font-display text-2xl font-semibold tnum tracking-tight">
                    {count}
                  </span>
                </div>
                <div className="mt-3 text-sm font-semibold">{card.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {card.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="text-sm font-semibold">Danh sách tài khoản</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {filtered.length} / {users.length} · {counts.active} đang hoạt động
              {roleFilter !== "all" ? ` · lọc ${roleLabel(roleFilter)}` : ""}
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, email, quyền…"
              className="h-10 pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
            Đang tải…
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-10">
            <EmptyState
              icon={Shield}
              title="Chưa có tài khoản"
              description="Tạo acc đầu tiên để cấp quyền manager / pm / member."
              action={
                <Button variant="brand" onClick={openNew}>
                  <Plus size={16} /> Thêm tài khoản
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 text-center text-sm text-muted-foreground">
            Không khớp bộ lọc.{" "}
            <button
              type="button"
              className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
              }}
            >
              Xóa lọc
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((u) => (
              <li
                key={u.id}
                className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-11 w-11 rounded-2xl">
                    <AvatarFallback className="rounded-2xl text-[13px]">
                      {initials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium leading-none">
                        {u.full_name}
                      </span>
                      {!u.is_active && (
                        <Badge variant="warning" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 truncate text-xs text-muted-foreground">
                      {u.email ?? "—"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
                  <Badge variant={roleBadgeVariant(u.app_role)}>
                    {roleLabel(u.app_role)}
                  </Badge>
                  <span className="min-w-[4.5rem] text-xs text-muted-foreground">
                    {u.job_role}
                  </span>
                  <span className="min-w-[6.5rem] text-right text-sm font-medium tnum tabular-nums">
                    {formatCurrency(u.base_salary)}
                  </span>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-70 sm:group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() => openEdit(u)}
                      title="Sửa"
                    >
                      <UserCog size={15} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() => remove(u)}
                      title="Xóa"
                      disabled={u.app_role === "admin"}
                    >
                      <Trash2 size={15} className="text-rose-500" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  "bg-gradient-to-br from-teal-500/20 via-sky-500/10 to-transparent",
                  "ring-1 ring-teal-500/25 text-teal-700 dark:text-teal-300"
                )}
              >
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <DialogTitle>
                  {editing ? "Sửa tài khoản" : "Tạo tài khoản mới"}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {editing
                    ? "Đổi quyền đăng nhập, mật khẩu và trạng thái tài khoản."
                    : "Tạo acc login + gán quyền hệ thống (admin / manager / pm / member)."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={onSubmit} key={editing?.id ?? "new"}>
            <DialogBody>
              <div className="flex flex-col gap-4 rounded-2xl bg-muted/30 p-5 ring-1 ring-border/40 sm:p-6">
                <Field>
                  <Label htmlFor="full_name">Họ tên</Label>
                  <FieldControl icon={<User />}>
                    <Input
                      id="full_name"
                      name="full_name"
                      required
                      defaultValue={editing?.full_name ?? ""}
                      className="pl-10"
                    />
                  </FieldControl>
                </Field>

                {!editing && (
                  <Field>
                    <Label htmlFor="email">Email đăng nhập</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="user@cong-ty.com"
                    />
                  </Field>
                )}

                <Field>
                  <Label htmlFor="password">
                    {editing ? "Mật khẩu mới" : "Mật khẩu"}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    minLength={editing ? undefined : 6}
                    required={!editing}
                    autoComplete="new-password"
                    placeholder={
                      editing ? "Để trống nếu giữ mật khẩu cũ" : "Tối thiểu 6 ký tự"
                    }
                  />
                </Field>

                <FieldGrid>
                  <Field>
                    <Label>Quyền hệ thống</Label>
                    <Select
                      value={appRole}
                      onValueChange={(v) => setAppRole(v as AppRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <Label>Chức danh</Label>
                    <FieldControl icon={<Briefcase />}>
                      <Select value={jobRole} onValueChange={setJobRole}>
                        <SelectTrigger className="pl-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_GROUPS.map((g) =>
                            g.roles.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FieldControl>
                  </Field>
                </FieldGrid>

                <FieldGrid>
                  <Field>
                    <Label>Level</Label>
                    <Select
                      value={level}
                      onValueChange={(v) => {
                        if (!isDevLevel(v)) return;
                        setLevel(v);
                        if (
                          !editing ||
                          Number(powerScore) === defaultPowerForLevel(level)
                        ) {
                          setPowerScore(String(defaultPowerForLevel(v)));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((lv) => (
                          <SelectItem key={lv} value={lv}>
                            {lv}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <Label htmlFor="power_score">Lực chiến (1–100)</Label>
                    <Input
                      id="power_score"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="1–100"
                      value={powerScore}
                      onChange={(e) => {
                        setPowerScore(
                          e.target.value.replace(/\D/g, "").slice(0, 3)
                        );
                      }}
                      onBlur={() => {
                        setPowerScore(
                          String(clampPower(Number(powerScore) || 50))
                        );
                      }}
                    />
                  </Field>
                </FieldGrid>

                {editing ? (
                  <Field>
                    <Label htmlFor="base_salary">Lương / tháng</Label>
                    <FieldControl icon={<Wallet />} suffix="VND">
                      <Input
                        id="base_salary"
                        name="base_salary"
                        type="number"
                        min={0}
                        defaultValue={editing.base_salary ?? 0}
                        className="pl-10 pr-14"
                      />
                    </FieldControl>
                  </Field>
                ) : (
                  <FieldGrid>
                    <Field>
                      <Label htmlFor="base_salary">Lương / tháng</Label>
                      <FieldControl icon={<Wallet />} suffix="VND">
                        <Input
                          id="base_salary"
                          name="base_salary"
                          type="number"
                          min={0}
                          defaultValue={0}
                          className="pl-10 pr-14"
                        />
                      </FieldControl>
                    </Field>
                    <Field>
                      <Label htmlFor="start_date">Ngày vào</Label>
                      <FieldControl icon={<CalendarDays />}>
                        <DatePicker
                          id="start_date"
                          name="start_date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          showIcon={false}
                          className="pl-10"
                        />
                      </FieldControl>
                    </Field>
                  </FieldGrid>
                )}
              </div>

              {editing && (
                <label
                  className={cn(
                    "flex min-h-[3.5rem] cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-3.5",
                    "bg-muted/30 ring-1 ring-border/50 transition-colors",
                    "hover:bg-muted/45 hover:ring-primary/25"
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-none">
                      Đang hoạt động
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      Tắt để khóa đăng nhập tài khoản này
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={editing.is_active}
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
              )}

              {error && (
                <div className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 ring-1 ring-rose-500/20">
                  {error}
                </div>
              )}
            </DialogBody>
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={saving}
                className="min-w-[7.5rem]"
              >
                {saving && <Loader2 className="animate-spin" />}
                {editing ? "Lưu thay đổi" : "Tạo tài khoản"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

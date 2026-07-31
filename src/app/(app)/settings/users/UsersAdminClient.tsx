"use client";

import { PageHeader } from "@/components/PageHeader";
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
import { ROLE_GROUPS } from "@/lib/roles";
import { APP_ROLES, roleLabel } from "@/lib/rbac";
import type { AppRole } from "@/types/database";
import { cn, formatCurrency, humanizeSupabaseError } from "@/lib/utils";
import {
  Briefcase,
  CalendarDays,
  Loader2,
  Plus,
  Shield,
  Trash2,
  User,
  UserCog,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string;
  job_role: string;
  app_role: AppRole;
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
    setError(null);
    setOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setAppRole(u.app_role);
    setJobRole(u.job_role);
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Tài khoản & phân quyền"
        subtitle="Tạo acc cấp dưới: Quản lý · PM · Member. Chỉ admin xem được quỹ lương."
        actions={
          <Button variant="brand" onClick={openNew}>
            <Plus size={16} /> Thêm tài khoản
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(
          [
            ["manager", "Quản lý", "Xem all dự án, không lương"],
            ["pm", "PM", "Dự án mình phụ trách"],
            ["member", "Member", "Dự án đang làm, không tiền"],
          ] as const
        ).map(([role, title, desc]) => (
          <div key={role} className="rounded-xl border p-3.5 bg-card">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield size={14} className="text-teal-600" />
              {title}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{desc}</div>
            <div className="text-lg font-semibold tnum mt-2">
              {users.filter((u) => u.app_role === role).length}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Người dùng</th>
              <th className="text-left px-4 py-3 font-medium">Quyền</th>
              <th className="text-left px-4 py-3 font-medium">Chức danh</th>
              <th className="text-right px-4 py-3 font-medium">Lương</th>
              <th className="text-right px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="inline animate-spin mr-2" size={14} />
                  Đang tải…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Chưa có tài khoản nào.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                  {!u.is_active && (
                    <Badge variant="warning" className="mt-1">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      u.app_role === "admin"
                        ? "destructive"
                        : u.app_role === "manager"
                        ? "brand"
                        : u.app_role === "pm"
                        ? "info"
                        : "secondary"
                    }
                  >
                    {roleLabel(u.app_role)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.job_role}</td>
                <td className="px-4 py-3 text-right tnum">
                  {formatCurrency(u.base_salary)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                    <UserCog size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(u)}>
                    <Trash2 size={14} className="text-rose-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                        <Input
                          id="start_date"
                          name="start_date"
                          type="date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
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

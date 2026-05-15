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
import { EmptyState } from "@/components/ui/empty-state";
import { ROLE_GROUPS } from "@/lib/roles";
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
  userLoadToday,
} from "@/lib/calculations";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatPercent,
  humanizeSupabaseError,
  toDateInput,
} from "@/lib/utils";
import type { Allocation, Profile, SalaryHistory } from "@/types/database";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

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
  const [editing, setEditing] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("BA");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Lương sẽ áp dụng từ ngày — chỉ hiện khi đổi mức lương
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  // Track giá trị salary input để detect thay đổi
  const [salaryInput, setSalaryInput] = useState<number>(0);

  const today = new Date();

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

  // Lấy số entries lịch sử lương của 1 profile
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

      // Nếu mức lương thay đổi → ghi 1 entry mới vào salary_history
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
        if (hist)
          setSalaryHistory((arr) => [hist as SalaryHistory, ...arr]);
      }

      setSaving(false);
      if (data) {
        setProfiles((arr) =>
          arr.map((p) => (p.id === editing.id ? (data as Profile) : p))
        );
        setOpen(false);
      }
    } else {
      // Tạo mới
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

      // Tạo entry lịch sử lương đầu tiên
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
        if (hist)
          setSalaryHistory((arr) => [hist as SalaryHistory, ...arr]);
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

  const totalSalary = profiles
    .filter((p) => p.is_active)
    .reduce((s, p) => s + Number(p.base_salary), 0);
  const benchCount = profiles.filter(
    (p) => p.is_active && userLoadToday(p.id, allocations, today) === 0
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace · Team"
        title="Quản lý nhân sự"
        subtitle="Thành viên team, lương theo lịch sử, trạng thái phân bổ và tải hiện tại."
        actions={
          <Button variant="brand" onClick={openNew}>
            <UserPlus />
            Thêm người
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Nhân sự active
            </div>
            <div className="text-2xl font-semibold mt-1 tnum">
              {profiles.filter((p) => p.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Quỹ lương / tháng
            </div>
            <div className="text-2xl font-semibold mt-1 tnum">
              {formatCurrency(totalSalary)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Đang bench
            </div>
            <div className="text-2xl font-semibold mt-1 tnum">{benchCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Danh sách thành viên</CardTitle>
          <CardDescription>
            Tải hiện tại = tổng % allocation đang chạy hôm nay.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Tên</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Lương / tháng</TableHead>
                <TableHead>Tải hiện tại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="pr-6 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
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
                  </TableCell>
                </TableRow>
              )}
              {profiles.map((p) => {
                const load = userLoadToday(p.id, allocations, today);
                const st = loadStatus(load);
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
                          <AvatarFallback className="text-xs">
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
                      {p.is_active ? (
                        <Badge variant={badgeVariant}>
                          {loadStatusLabel(st)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Off</Badge>
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

            {/* Effective_from prompt — chỉ hiện khi đang edit và lương đã đổi */}
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
                    {formatCurrency(editing.base_salary)}
                    ); từ ngày này trở đi dùng mức mới (
                    {formatCurrency(salaryInput)}). Lịch sử sẽ được ghi lại.
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

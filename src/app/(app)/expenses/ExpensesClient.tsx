"use client";

import { PageHeader } from "@/components/PageHeader";
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
  SelectItem,
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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatDate,
  humanizeSupabaseError,
  monthKey,
  toDateInput,
} from "@/lib/utils";
import type { OperatingExpense, Project } from "@/types/database";
import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORIES = [
  "server",
  "license",
  "outsource",
  "travel",
  "marketing",
  "other",
] as const;
const CAT_LABEL: Record<string, string> = {
  server: "Hạ tầng / Server",
  license: "License / SaaS",
  outsource: "Outsource",
  travel: "Đi lại / Onsite",
  marketing: "Marketing",
  other: "Khác",
};
const CAT_COLORS = [
  "hsl(238 84% 67%)",
  "hsl(199 89% 48%)",
  "hsl(158 64% 52%)",
  "hsl(38 92% 50%)",
  "hsl(330 81% 60%)",
  "hsl(215 16% 56%)",
];

export function ExpensesClient({
  projects,
  initialExpenses,
}: {
  projects: Project[];
  initialExpenses: OperatingExpense[];
}) {
  const supabase = createClient();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OperatingExpense | null>(null);
  const [category, setCategory] = useState<string>("other");
  const [projectId, setProjectId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setEditing(null);
    setCategory("other");
    setProjectId("none");
  }

  function openNew() {
    resetForm();
    setError(null);
    setOpen(true);
  }

  function openEdit(e: OperatingExpense) {
    setEditing(e);
    setCategory(e.category);
    setProjectId(e.project_id ?? "none");
    setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      project_id: projectId === "none" ? null : projectId,
      amount: Number(fd.get("amount") || 0),
      description: (fd.get("description") as string) || null,
      category,
      spent_date:
        (fd.get("spent_date") as string) ||
        new Date().toISOString().slice(0, 10),
    };
    if (editing) {
      const { data, error: err } = await supabase
        .from("operating_expenses")
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
        setExpenses((arr) =>
          arr.map((x) =>
            x.id === editing.id ? (data as OperatingExpense) : x
          )
        );
        setOpen(false);
        resetForm();
      }
    } else {
      const { data, error: err } = await supabase
        .from("operating_expenses")
        .insert(payload)
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(humanizeSupabaseError(err.message));
        return;
      }
      if (data) {
        setExpenses((arr) => [data as OperatingExpense, ...arr]);
        setOpen(false);
        resetForm();
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Xóa khoản chi này?")) return;
    await supabase.from("operating_expenses").delete().eq("id", id);
    setExpenses((arr) => arr.filter((x) => x.id !== id));
  }

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses)
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return CATEGORIES.map((c) => ({
      name: CAT_LABEL[c],
      value: map.get(c) ?? 0,
      raw: c,
    })).filter((x) => x.value > 0);
  }, [expenses]);

  const total = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );
  const thisMonth = useMemo(() => {
    const k = monthKey(new Date());
    return expenses
      .filter((e) => monthKey(new Date(e.spent_date)) === k)
      .reduce((s, e) => s + Number(e.amount), 0);
  }, [expenses]);

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Chi phí vận hành"
        subtitle="Server, license, outsource và các khoản phát sinh ngoài lương."
        actions={
          <Button variant="brand" onClick={openNew}>
            <Plus /> Thêm chi phí
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Tổng chi phí vận hành
            </div>
            <div className="text-2xl font-semibold mt-1 tnum">
              {formatCurrency(total)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Tháng này
            </div>
            <div className="text-2xl font-semibold mt-1 tnum text-indigo-500">
              {formatCurrency(thisMonth)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Số khoản ghi nhận
            </div>
            <div className="text-2xl font-semibold mt-1 tnum">
              {expenses.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Phân bổ theo loại</CardTitle>
            <CardDescription>Tổng theo category</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                Chưa có dữ liệu.
              </div>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory}
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {byCategory.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CAT_COLORS[i % CAT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const item = payload[0];
                          return (
                            <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
                              <div className="font-medium">{item.name}</div>
                              <div className="tnum text-muted-foreground">
                                {formatCurrency(item.value as number)}
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-3">
                  {byCategory.map((c, i) => (
                    <div
                      key={c.raw}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{
                            background: CAT_COLORS[i % CAT_COLORS.length],
                          }}
                        />
                        {c.name}
                      </span>
                      <span className="tnum font-medium">
                        {formatCurrency(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lịch sử chi phí</CardTitle>
            <CardDescription>Mới nhất ở trên</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Ngày</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Dự án</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="pr-6 w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Receipt
                        size={20}
                        className="mx-auto mb-2 text-muted-foreground"
                      />
                      Chưa có khoản chi nào.
                    </TableCell>
                  </TableRow>
                )}
                {expenses.map((e) => {
                  const proj = e.project_id
                    ? projectsById.get(e.project_id)
                    : null;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="pl-6 text-xs whitespace-nowrap text-muted-foreground">
                        {formatDate(e.spent_date)}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="truncate">{e.description || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">
                          {CAT_LABEL[e.category] ?? e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {proj ? (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: proj.color }}
                            />
                            {proj.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Chung</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tnum font-medium">
                        {formatCurrency(e.amount)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(e)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => remove(e.id)}
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
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa khoản chi" : "Thêm khoản chi"}
            </DialogTitle>
            <DialogDescription>
              Server, license, outsource, hoặc bất cứ chi phí nào ngoài lương.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" key={editing?.id ?? "new"}>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                name="description"
                required
                placeholder="VD: Mua server AWS tháng 5, License Figma 5 chỗ..."
                defaultValue={editing?.description ?? ""}
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
                  step="10000"
                  required
                  defaultValue={editing?.amount ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spent_date">Ngày chi</Label>
                <Input
                  id="spent_date"
                  name="spent_date"
                  type="date"
                  defaultValue={
                    toDateInput(editing?.spent_date) ||
                    new Date().toISOString().slice(0, 10)
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Loại</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CAT_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gán cho dự án</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Chi phí chung —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                {saving
                  ? "Đang lưu..."
                  : editing
                  ? "Lưu thay đổi"
                  : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

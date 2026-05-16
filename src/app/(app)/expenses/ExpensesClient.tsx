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
import { EmptyState } from "@/components/ui/empty-state";
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
  cn,
  formatCurrency,
  formatDate,
  humanizeSupabaseError,
  monthKey,
  toDateInput,
} from "@/lib/utils";
import type { OperatingExpense, Project } from "@/types/database";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
const CAT_COLORS: Record<string, string> = {
  server: "hsl(238 84% 67%)",
  license: "hsl(199 89% 48%)",
  outsource: "hsl(158 64% 52%)",
  travel: "hsl(38 92% 50%)",
  marketing: "hsl(330 81% 60%)",
  other: "hsl(215 16% 56%)",
};

type Range = "3mo" | "6mo" | "12mo" | "ytd" | "all";

export function ExpensesClient({
  projects,
  initialExpenses,
}: {
  projects: Project[];
  initialExpenses: OperatingExpense[];
}) {
  const supabase = createClient();
  const [expenses, setExpenses] = useState(initialExpenses);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OperatingExpense | null>(null);
  const [category, setCategory] = useState<string>("other");
  const [projectId, setProjectId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [range, setRange] = useState<Range>("6mo");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [projFilter, setProjFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const today = useMemo(() => new Date(), []);

  // Range -> start date
  const rangeStart = useMemo(() => {
    const d = new Date(today);
    if (range === "3mo") d.setMonth(d.getMonth() - 2);
    else if (range === "6mo") d.setMonth(d.getMonth() - 5);
    else if (range === "12mo") d.setMonth(d.getMonth() - 11);
    else if (range === "ytd") return new Date(today.getFullYear(), 0, 1);
    else return new Date(0);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [range, today]);

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  // Filtered list
  const filtered = useMemo(() => {
    let list = expenses;
    list = list.filter((e) => new Date(e.spent_date) >= rangeStart);
    if (catFilter !== "all") list = list.filter((e) => e.category === catFilter);
    if (projFilter !== "all") {
      if (projFilter === "none") list = list.filter((e) => !e.project_id);
      else list = list.filter((e) => e.project_id === projFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) =>
        (e.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, rangeStart, catFilter, projFilter, search]);

  // Hero stats
  const totalInRange = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const thisMonthKey = monthKey(today);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = monthKey(lastMonth);
  const thisMonthTotal = expenses
    .filter((e) => monthKey(new Date(e.spent_date)) === thisMonthKey)
    .reduce((s, e) => s + Number(e.amount), 0);
  const lastMonthTotal = expenses
    .filter((e) => monthKey(new Date(e.spent_date)) === lastMonthKey)
    .reduce((s, e) => s + Number(e.amount), 0);
  const momPct =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : null;

  // Monthly buckets (for chart) — luôn 6 tháng gần nhất hoặc theo range
  const monthlyBuckets = useMemo(() => {
    const monthsCount =
      range === "3mo" ? 3 : range === "12mo" ? 12 : range === "ytd"
        ? today.getMonth() + 1
        : range === "all"
        ? 12
        : 6;
    const buckets: {
      key: string;
      label: string;
      year: number;
      month: number;
    }[] = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      buckets.push({
        key: monthKey(d),
        label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      });
    }
    return buckets;
  }, [range, today]);

  const chartData = useMemo(() => {
    return monthlyBuckets.map((b) => {
      const row: Record<string, number | string> = {
        month: b.label,
        key: b.key,
      };
      for (const c of CATEGORIES) row[c] = 0;
      for (const e of expenses) {
        if (monthKey(new Date(e.spent_date)) !== b.key) continue;
        if (projFilter !== "all") {
          if (projFilter === "none" && e.project_id) continue;
          if (projFilter !== "none" && e.project_id !== projFilter) continue;
        }
        row[e.category] = ((row[e.category] as number) ?? 0) + Number(e.amount);
      }
      return row;
    });
  }, [monthlyBuckets, expenses, projFilter]);

  const avgMonthly = useMemo(() => {
    const totals = chartData.map((d) =>
      CATEGORIES.reduce((s, c) => s + (Number(d[c]) || 0), 0)
    );
    const sum = totals.reduce((a, b) => a + b, 0);
    return totals.length > 0 ? sum / totals.length : 0;
  }, [chartData]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered)
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return CATEGORIES.map((c) => ({
      name: CAT_LABEL[c],
      value: map.get(c) ?? 0,
      raw: c,
      color: CAT_COLORS[c],
    })).filter((x) => x.value > 0);
  }, [filtered]);

  const topCategory = byCategory[0];

  const byProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      const key = e.project_id ?? "_none";
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries())
      .map(([id, value]) => ({
        id,
        name:
          id === "_none"
            ? "Chi phí chung"
            : projectsById.get(id)?.name ?? "(đã xoá)",
        color:
          id === "_none"
            ? "hsl(var(--muted-foreground))"
            : projectsById.get(id)?.color ?? "#888",
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, projectsById]);

  const topProject = byProject[0];

  // -- Mutations --
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
          arr.map((x) => (x.id === editing.id ? (data as OperatingExpense) : x))
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace · Chi phí"
        title="Chi phí vận hành"
        subtitle="KPI theo tháng + stacked bar theo category + filter time/category/project — biết tiền đang đi đâu."
        actions={
          <Button variant="brand" onClick={openNew}>
            <Plus /> Thêm chi phí
          </Button>
        }
      />

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Tổng (range)"
          value={formatCurrency(totalInRange)}
          hint={`${filtered.length} khoản · ${rangeLabel(range)}`}
          tone="indigo"
          icon={<Wallet size={14} />}
        />
        <KpiCard
          label="Tháng này"
          value={formatCurrency(thisMonthTotal)}
          hint={
            momPct !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5",
                  momPct > 5
                    ? "text-rose-500"
                    : momPct < -5
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                )}
              >
                {momPct > 0 ? (
                  <ArrowUp size={11} />
                ) : (
                  <ArrowDown size={11} />
                )}
                {Math.abs(momPct).toFixed(0)}% vs tháng trước
              </span>
            ) : (
              "Chưa có data tháng trước"
            )
          }
          tone={momPct !== null && momPct > 10 ? "rose" : "violet"}
          icon={<Calendar size={14} />}
        />
        <KpiCard
          label="TB / tháng"
          value={formatCurrency(avgMonthly)}
          hint={`${monthlyBuckets.length} tháng gần nhất`}
          tone="emerald"
          icon={<TrendingUp size={14} />}
        />
        <KpiCard
          label="Top category"
          value={topCategory ? CAT_LABEL[topCategory.raw] : "—"}
          hint={
            topCategory
              ? `${formatCurrency(topCategory.value)} · ${Math.round(
                  (topCategory.value / Math.max(1, totalInRange)) * 100
                )}%`
              : "Chưa có data"
          }
          tone="amber"
          icon={<Receipt size={14} />}
        />
        <KpiCard
          label="Top dự án ngốn"
          value={topProject ? topProject.name : "—"}
          hint={
            topProject
              ? `${formatCurrency(topProject.value)}`
              : `${formatCurrency(totalAll)} từ lúc bắt đầu`
          }
          tone="sky"
          icon={<Wallet size={14} />}
        />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mô tả khoản chi…"
                className="h-9 pl-7 pr-2 text-xs bg-card"
              />
            </div>

            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="h-9 w-[150px] text-xs font-medium bg-card shadow-sm">
                <SelectValue placeholder="Mọi loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Mọi loại
                </SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {CAT_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projFilter} onValueChange={setProjFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs font-medium bg-card shadow-sm">
                <SelectValue placeholder="Mọi dự án" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Mọi dự án
                </SelectItem>
                <SelectItem value="none" className="text-xs">
                  Chi phí chung
                </SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
              {(["3mo", "6mo", "12mo", "ytd", "all"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 h-7 rounded-md text-xs font-medium transition",
                    range === r
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {rangeLabel(r)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly stacked bar — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chi phí theo tháng</CardTitle>
            <CardDescription>
              Stack theo loại · {monthlyBuckets.length} tháng gần nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
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
                    width={48}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : `${v}`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--accent) / 0.3)" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const total = payload.reduce(
                        (s, p) => s + (Number(p.value) || 0),
                        0
                      );
                      const sorted = [...payload].sort(
                        (a, b) =>
                          (Number(b.value) || 0) - (Number(a.value) || 0)
                      );
                      return (
                        <div className="rounded-lg border bg-popover/95 backdrop-blur-md px-3 py-2.5 shadow-lg text-xs min-w-[210px]">
                          <div className="flex justify-between gap-3 items-baseline mb-1.5">
                            <span className="font-semibold">{label}</span>
                            <span className="tnum font-semibold text-primary">
                              {formatCurrency(total)}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {sorted
                              .filter((p) => Number(p.value) > 0)
                              .map((p) => (
                                <div
                                  key={p.dataKey as string}
                                  className="flex justify-between gap-3 items-center"
                                >
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{
                                        background:
                                          CAT_COLORS[p.dataKey as string],
                                      }}
                                    />
                                    {CAT_LABEL[p.dataKey as string]}
                                  </span>
                                  <span className="tnum">
                                    {formatCurrency(Number(p.value) || 0)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {CATEGORIES.map((c) => (
                    <Bar
                      key={c}
                      dataKey={c}
                      stackId="a"
                      name={CAT_LABEL[c]}
                      fill={CAT_COLORS[c]}
                      animationDuration={600}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Donut chart — category split */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Phân bổ theo loại</CardTitle>
            <CardDescription>
              {rangeLabel(range)} · {formatCurrency(totalInRange)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-12">
                Chưa có data trong khoảng này.
              </div>
            ) : (
              <>
                <div className="h-40 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory}
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {byCategory.map((c) => (
                          <Cell key={c.raw} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const item = payload[0];
                          return (
                            <div className="rounded-lg border bg-popover/95 backdrop-blur-md px-3 py-2 shadow-md text-xs">
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Tổng
                    </div>
                    <div className="text-sm font-semibold tnum mt-0.5 max-w-[80%] truncate">
                      {formatCurrency(totalInRange)}
                    </div>
                  </div>
                </div>
                <div className="space-y-1 mt-3">
                  {byCategory.map((c) => {
                    const pct = (c.value / Math.max(1, totalInRange)) * 100;
                    const active = catFilter === c.raw;
                    return (
                      <button
                        key={c.raw}
                        type="button"
                        onClick={() =>
                          setCatFilter(active ? "all" : c.raw)
                        }
                        className={cn(
                          "w-full flex items-center justify-between text-xs gap-2 px-1.5 py-1 rounded-md transition",
                          active
                            ? "bg-primary/10"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: c.color }}
                          />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0 text-muted-foreground tnum">
                          <span>{pct.toFixed(0)}%</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(c.value)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project breakdown bar list */}
      {byProject.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chi phí theo dự án</CardTitle>
            <CardDescription>
              {byProject.length} dự án trong {rangeLabel(range).toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byProject.slice(0, 8).map((p) => {
                const pct = (p.value / Math.max(1, totalInRange)) * 100;
                const active =
                  projFilter === p.id ||
                  (p.id === "_none" && projFilter === "none");
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const target =
                        p.id === "_none" ? "none" : p.id;
                      setProjFilter(active ? "all" : target);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition text-left",
                      active ? "bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <span className="flex items-center gap-2 w-44 shrink-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: p.color }}
                      />
                      <span className="text-xs font-medium truncate">
                        {p.name}
                      </span>
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)`,
                        }}
                      />
                    </div>
                    <span className="text-xs tnum text-muted-foreground w-12 text-right">
                      {pct.toFixed(0)}%
                    </span>
                    <span className="text-xs tnum font-medium w-28 text-right">
                      {formatCurrency(p.value)}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Lịch sử chi phí</CardTitle>
              <CardDescription>
                {filtered.length} khoản · sort theo ngày mới nhất
              </CardDescription>
            </div>
          </div>
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    {expenses.length === 0 ? (
                      <EmptyState
                        icon={Receipt}
                        tone="amber"
                        title="Chưa có chi phí ghi nhận"
                        description="Server, license, outsource, marketing — track tất cả khoản chi ngoài lương ở đây để có P&L chuẩn."
                        action={
                          <Button variant="brand" onClick={openNew}>
                            <Plus /> Thêm khoản đầu tiên
                          </Button>
                        }
                      />
                    ) : (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        Không có khoản nào khớp filter — thử bỏ search hoặc đổi
                        range.
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.spent_date).getTime() -
                      new Date(a.spent_date).getTime()
                  )
                  .map((e) => {
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
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md"
                            style={{
                              background: `${CAT_COLORS[e.category]}1a`,
                              color: CAT_COLORS[e.category],
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: CAT_COLORS[e.category] }}
                            />
                            {CAT_LABEL[e.category] ?? e.category}
                          </span>
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
                            <span className="text-muted-foreground italic">
                              Chung
                            </span>
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
                  })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function rangeLabel(r: Range): string {
  switch (r) {
    case "3mo":
      return "3 tháng";
    case "6mo":
      return "6 tháng";
    case "12mo":
      return "12 tháng";
    case "ytd":
      return "Từ đầu năm";
    case "all":
      return "Tất cả";
  }
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
  hint?: React.ReactNode;
  tone: Tone;
  icon: React.ReactNode;
}) {
  const t = toneMap[tone];
  return (
    <div
      className={cn("rounded-xl border p-3 lg:p-4 relative overflow-hidden", t.bg)}
    >
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
      <div
        className={cn(
          "text-base lg:text-lg font-semibold tnum tracking-tight truncate",
          t.text
        )}
      >
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

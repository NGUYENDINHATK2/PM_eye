"use client";

import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Slider } from "@/components/ui/slider";
import {
  loadStatus,
  loadStatusLabel,
  userLoadCurrentMonth,
  userPeakLoad,
} from "@/lib/calculations";
import { createClient } from "@/lib/supabase/client";
import {
  cn,
  formatDate,
  formatPercent,
  humanizeSupabaseError,
  toDateInput,
} from "@/lib/utils";
import type {
  Allocation,
  Profile,
  Project,
  ProjectPhase,
} from "@/types/database";
import { AllocationTimeline } from "@/components/allocations/AllocationTimeline";
import {
  AlertTriangle,
  CalendarRange,
  FolderKanban,
  List,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

export function AllocationsClient({
  profiles,
  projects,
  phases,
  initialAllocations,
}: {
  profiles: Profile[];
  projects: Project[];
  phases: ProjectPhase[];
  initialAllocations: Allocation[];
}) {
  const supabase = createClient();
  const [allocations, setAllocations] = useState(initialAllocations);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Allocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [percent, setPercent] = useState(0.5);
  const [userId, setUserId] = useState(profiles[0]?.id ?? "");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [phaseId, setPhaseId] = useState<string>("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1))
      .toISOString()
      .slice(0, 10)
  );
  const [note, setNote] = useState("");

  // Allocations sẵn có cho cặp user + project hiện đang chọn (trừ cái đang edit)
  // → dùng để hiển thị hint + check overlap thời gian
  const existingForCombo = useMemo(() => {
    if (!userId || !projectId) return [];
    return allocations
      .filter(
        (a) =>
          a.user_id === userId &&
          a.project_id === projectId &&
          a.id !== editing?.id
      )
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [allocations, userId, projectId, editing?.id]);

  // Trả về allocation đầu tiên bị overlap với khoảng [start, end], hoặc null nếu ok
  function findOverlap(start: string, end: string): Allocation | null {
    for (const a of existingForCombo) {
      // overlap rule: start <= a.end_date && end >= a.start_date
      if (start <= a.end_date && end >= a.start_date) {
        return a;
      }
    }
    return null;
  }

  const projectPhases = phases.filter((ph) => ph.project_id === projectId);

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );
  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const phasesById = useMemo(
    () => new Map(phases.map((p) => [p.id, p])),
    [phases]
  );

  function resetForm() {
    setEditing(null);
    setPercent(0.5);
    setUserId(profiles[0]?.id ?? "");
    setProjectId(projects[0]?.id ?? "");
    setPhaseId("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(
      new Date(new Date().setMonth(new Date().getMonth() + 1))
        .toISOString()
        .slice(0, 10)
    );
    setNote("");
  }

  function openNew() {
    resetForm();
    setError(null);
    setOpen(true);
  }

  function openEdit(a: Allocation) {
    setEditing(a);
    setUserId(a.user_id);
    setProjectId(a.project_id);
    setPhaseId(a.phase_id ?? "");
    setPercent(Number(a.percent));
    setStartDate(toDateInput(a.start_date));
    setEndDate(toDateInput(a.end_date));
    setNote(a.note ?? "");
    setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !projectId) return;
    setError(null);

    // Validate dates
    if (!startDate || !endDate) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc.");
      return;
    }
    if (startDate > endDate) {
      setError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
      return;
    }

    // Check overlap với các đợt phân bổ khác cùng user + project
    const conflict = findOverlap(startDate, endDate);
    if (conflict) {
      setError(
        `Khoảng thời gian này chồng với đợt đã có: ${formatDate(
          conflict.start_date
        )} → ${formatDate(conflict.end_date)} (${formatPercent(
          conflict.percent
        )}). Đổi ngày để không trùng.`
      );
      return;
    }

    setSaving(true);
    const payload = {
      user_id: userId,
      project_id: projectId,
      phase_id: phaseId || null,
      percent,
      start_date: startDate,
      end_date: endDate,
      note: note || null,
    };
    if (editing) {
      const { data, error: err } = await supabase
        .from("allocations")
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
        setAllocations((arr) =>
          arr.map((x) => (x.id === editing.id ? (data as Allocation) : x))
        );
        setOpen(false);
        resetForm();
      }
    } else {
      const { data, error: err } = await supabase
        .from("allocations")
        .insert(payload)
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(humanizeSupabaseError(err.message));
        return;
      }
      if (data) {
        setAllocations((a) => [...a, data as Allocation]);
        setOpen(false);
        resetForm();
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Xóa phân bổ này?")) return;
    await supabase.from("allocations").delete().eq("id", id);
    setAllocations((arr) => arr.filter((x) => x.id !== id));
  }

  // Peak load của user trong khoảng allocation đang gõ — loại trừ allocation đang edit
  // để không bị double-count với bản cũ. Tính theo NGÀY (concurrent load) thay vì
  // trung bình tháng cho chuẩn.
  const overloadHint = useMemo(() => {
    if (!userId) return null;
    if (!startDate || !endDate) return null;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e < s) return null;
    return userPeakLoad(userId, allocations, s, e, percent, editing?.id);
  }, [userId, startDate, endDate, percent, allocations, editing?.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, Allocation[]>();
    for (const a of allocations) {
      const list = map.get(a.user_id) ?? [];
      list.push(a);
      map.set(a.user_id, list);
    }
    return map;
  }, [allocations]);

  const today = new Date();

  // View toggle: timeline (Gantt) vs list
  const [view, setView] = useState<"timeline" | "list">("timeline");

  // Timeline range
  const [range, setRange] = useState<"3mo" | "6mo" | "12mo" | "EOY" | "year">("EOY");
  // Group rows by person or by project
  const [groupBy, setGroupBy] = useState<"person" | "project">("person");
  // Density / zoom level
  const [density, setDensity] = useState<"compact" | "normal" | "comfy">("normal");
  const timelineRange = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    let end: Date;
    if (range === "EOY") {
      end = new Date(today.getFullYear(), 11, 31);
      if (
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30) <
        3
      ) {
        end = new Date(today.getFullYear() + 1, 5, 30);
      }
    } else if (range === "year") {
      end = new Date(today.getFullYear() + 1, today.getMonth(), 0);
    } else if (range === "12mo") {
      end = new Date(today.getFullYear(), today.getMonth() + 12, 0);
    } else if (range === "6mo") {
      end = new Date(today.getFullYear(), today.getMonth() + 6, 0);
    } else {
      // 3mo
      end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
    }
    return { start, end };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace · Phân bổ"
        title="Phân bổ nhân sự"
        subtitle="Gán % thời gian từng người vào dự án/giai đoạn — xem theo Timeline (Gantt) hoặc List."
        actions={
          <Button
            variant="brand"
            onClick={openNew}
            disabled={!profiles.length || !projects.length}
          >
            <Plus /> Phân bổ
          </Button>
        }
      />

      {/* View toolbar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* View tabs */}
          <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setView("timeline")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition",
                view === "timeline"
                  ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarRange size={13} />
              Timeline
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition",
                view === "list"
                  ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List size={13} />
              List
            </button>
          </div>

          {view === "timeline" && (
            <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
              {(["3mo", "6mo", "12mo", "EOY", "year"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 h-8 rounded-md text-xs font-medium transition",
                    range === r
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r === "3mo"
                    ? "3 tháng"
                    : r === "6mo"
                    ? "6 tháng"
                    : r === "12mo"
                    ? "12 tháng"
                    : r === "year"
                    ? "1 năm"
                    : "Cuối năm"}
                </button>
              ))}
            </div>
          )}
        </div>

        {view === "timeline" && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Group by */}
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                Nhóm theo
              </span>
              <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
                {(["person", "project"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroupBy(g)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition",
                      groupBy === g
                        ? "bg-accent text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {g === "person" ? (
                      <>
                        <UserIcon size={11} /> Nhân sự
                      </>
                    ) : (
                      <>
                        <FolderKanban size={11} /> Dự án
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Density / zoom */}
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                Mật độ
              </span>
              <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
                {(["compact", "normal", "comfy"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    className={cn(
                      "px-3 h-7 rounded-md text-xs font-medium transition",
                      density === d
                        ? "bg-accent text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {d === "compact" ? "Gọn" : d === "normal" ? "Vừa" : "To"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {(!profiles.length || !projects.length) && (
        <Card>
          <CardContent className="p-5 flex items-center gap-3 bg-amber-500/10 ring-1 ring-amber-500/20 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} />
            <span className="text-sm">
              Bạn cần có ít nhất 1 nhân sự và 1 dự án trước khi phân bổ.
            </span>
          </CardContent>
        </Card>
      )}

      {view === "timeline" ? (
        <AllocationTimeline
          profiles={profiles}
          allocations={allocations}
          projects={projects}
          phases={phases}
          startDate={timelineRange.start}
          endDate={timelineRange.end}
          onEditAllocation={openEdit}
          groupBy={groupBy}
          density={density}
        />
      ) : null}

      {view === "list" && (
      <div className="space-y-3">
        {profiles.map((p) => {
          const items = grouped.get(p.id) ?? [];
          const load = userLoadCurrentMonth(p.id, allocations, today);
          const st = loadStatus(load);
          const variant =
            st === "critical" || st === "overloaded"
              ? "destructive"
              : st === "idle"
              ? "info"
              : st === "underused"
              ? "warning"
              : "success";
          return (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {p.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{p.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Tải hiện tại
                      </div>
                      <div className="text-sm font-semibold tnum">
                        {formatPercent(load)}
                      </div>
                    </div>
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
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
                    <Badge variant={variant}>{loadStatusLabel(st)}</Badge>
                  </div>
                </div>

                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    Chưa phân bổ.
                  </div>
                )}

                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map((a) => {
                      const proj = projectsById.get(a.project_id);
                      const ph = a.phase_id ? phasesById.get(a.phase_id) : null;
                      return (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 p-2.5 rounded-md bg-muted/40 hover:bg-muted/70 transition"
                        >
                          <span
                            className="w-1 h-8 rounded-full shrink-0"
                            style={{ background: proj?.color ?? "#888" }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {proj?.name}
                              {ph && (
                                <span className="text-muted-foreground font-normal">
                                  {" · "}
                                  {ph.phase_name}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {formatDate(a.start_date)} → {formatDate(a.end_date)}
                              {a.note && ` · ${a.note}`}
                            </div>
                          </div>
                          <Badge variant="brand">{formatPercent(a.percent)}</Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(a)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => remove(a.id)}
                          >
                            <Trash2 className="text-rose-500" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa phân bổ" : "Phân bổ nhân sự vào dự án"}
            </DialogTitle>
            <DialogDescription>
              Kéo slider để chọn % thời gian. Hệ thống sẽ cảnh báo nếu tổng tải
              vượt 100%.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nhân sự</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn người" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name} — {p.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dự án</Label>
                <Select
                  value={projectId}
                  onValueChange={(v) => {
                    setProjectId(v);
                    setPhaseId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dự án" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {existingForCombo.length > 0 && (
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <div>
                      Người này đã có{" "}
                      <strong>{existingForCombo.length}</strong> đợt phân bổ
                      trong dự án này:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {existingForCombo.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-foreground/80 text-[10px] tnum"
                          title={a.note ?? undefined}
                        >
                          {formatDate(a.start_date)} → {formatDate(a.end_date)}
                          <span className="font-semibold ml-1">
                            {formatPercent(a.percent)}
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] italic">
                      Có thể thêm đợt mới — chỉ cần khoảng ngày không chồng các đợt trên.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Giai đoạn (tùy chọn)</Label>
              <Select
                value={phaseId || "none"}
                onValueChange={(v) => setPhaseId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Toàn dự án —</SelectItem>
                  {projectPhases.map((ph) => (
                    <SelectItem key={ph.id} value={ph.id}>
                      {ph.phase_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slider hero */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-sky-500/10 ring-1 ring-indigo-500/20">
              <div className="flex items-center justify-between mb-4">
                <Label>% thời gian dành cho dự án này</Label>
                <span className="text-3xl font-semibold tabular-nums bg-gradient-to-br from-indigo-500 to-sky-500 bg-clip-text text-transparent">
                  {Math.round(percent * 100)}%
                </span>
              </div>
              <Slider
                value={[percent * 100]}
                onValueChange={(v) => setPercent(v[0] / 100)}
                min={0}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              {overloadHint && overloadHint.load > 1 && (
                <div className="mt-4 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2 rounded-md">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    Ngày <strong>{formatDate(overloadHint.date)}</strong> sẽ
                    tổng load{" "}
                    <strong>{formatPercent(overloadHint.load)}</strong> — vượt
                    100%.
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="from">Từ ngày</Label>
                <Input
                  id="from"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">Đến ngày</Label>
                <Input
                  id="to"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cover BE khi A nghỉ thai sản..."
              />
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
              <Button
                type="submit"
                variant="brand"
                disabled={!projectId || saving}
              >
                {saving
                  ? "Đang lưu..."
                  : editing
                  ? "Lưu thay đổi"
                  : "Phân bổ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

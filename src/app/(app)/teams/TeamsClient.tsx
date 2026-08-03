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
import { Field, FieldGrid } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/lib/hooks/useAppData";
import { canWriteTeams } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { Profile, Team, TeamMember } from "@/types/database";
import {
  Crown,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const TEAM_COLORS = [
  "#0d9488",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#ca8a04",
];

export function TeamsClient({
  initialTeams,
  initialMembers,
  profiles,
}: {
  initialTeams: Team[];
  initialMembers: TeamMember[];
  profiles: Profile[];
}) {
  const { data: appData, mutate, refresh } = useAppData();
  const canWrite = canWriteTeams(appData?.user.role);

  const teams = appData?.teams ?? initialTeams;
  const members = appData?.teamMembers ?? initialMembers;

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );
  const activeProfiles = useMemo(
    () => profiles.filter((p) => p.is_active),
    [profiles]
  );

  const memberTeamByUser = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of members) m.set(row.user_id, row.team_id);
    return m;
  }, [members]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => {
      const leader = t.leader_id ? profilesById.get(t.leader_id) : null;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (leader?.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [teams, search, profilesById]);

  function openNew() {
    setEditing(null);
    setName("");
    setDescription("");
    setLeaderId("");
    setColor(TEAM_COLORS[teams.length % TEAM_COLORS.length]);
    setMemberIds([]);
    setOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setName(team.name);
    setDescription(team.description ?? "");
    setLeaderId(team.leader_id ?? "");
    setColor(team.color || TEAM_COLORS[0]);
    setMemberIds(
      members.filter((m) => m.team_id === team.id).map((m) => m.user_id)
    );
    setOpen(true);
  }

  function toggleMember(userId: string) {
    setMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function onLeaderChange(id: string) {
    setLeaderId(id);
    setMemberIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (!name.trim()) {
      toast.error("Nhập tên team.");
      return;
    }
    if (!leaderId) {
      toast.error("Chọn leader cho team.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        leader_id: leaderId,
        color,
        member_ids: memberIds,
      };

      const res = editing
        ? await fetch(`/api/teams/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        team?: Team;
        members?: TeamMember[];
      } | null;

      if (!res.ok) {
        throw new Error(body?.message ?? "Không lưu được team.");
      }

      await refresh({ force: true });
      toast.success(editing ? "Đã cập nhật team." : "Đã tạo team.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu team.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(team: Team) {
    if (!canWrite) return;
    if (!confirm(`Xóa team “${team.name}”? Thành viên sẽ không thuộc team nào.`))
      return;

    const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      toast.error(body?.message ?? "Không xóa được team.");
      return;
    }

    mutate((prev) => ({
      ...prev,
      teams: (prev.teams ?? []).filter((t) => t.id !== team.id),
      teamMembers: (prev.teamMembers ?? []).filter((m) => m.team_id !== team.id),
    }));
    toast.success("Đã xóa team.");
  }

  const unassignedCount = activeProfiles.filter(
    (p) => !memberTeamByUser.has(p.id)
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace · Tổ chức"
        title="Teams"
        subtitle="Nhóm nhân sự + tổng lực chiến. Gắn team vào dự án ở trang Dự án (cần add_project_ops.sql)."
        actions={
          canWrite ? (
            <Button variant="brand" onClick={openNew}>
              <Plus /> Tạo team
            </Button>
          ) : undefined
        }
      />

      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi label="Số team" value={teams.length.toString()} />
          <Kpi
            label="Đã xếp team"
            value={(activeProfiles.length - unassignedCount).toString()}
            hint={`/ ${activeProfiles.length} active`}
          />
          <Kpi
            label="Chưa có team"
            value={unassignedCount.toString()}
            hint={unassignedCount > 0 ? "Cần xếp vào team" : "Tất cả đã xếp"}
          />
        </div>
      )}

      {teams.length > 0 && (
        <div className="relative max-w-sm">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Tìm team hoặc leader…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
      )}

      {teams.length === 0 ? (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
          <EmptyState
            icon={UsersRound}
            tone="sky"
            title="Chưa có team nào"
            description="Tạo team để nhóm nhân sự theo đơn vị tổ chức — tách biệt với phân bổ dự án."
            action={
              canWrite ? (
                <Button variant="brand" onClick={openNew}>
                  <Plus /> Tạo team đầu tiên
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card px-4 py-14 text-center text-sm text-muted-foreground ring-1 ring-border/70">
          Không có team khớp tìm kiếm.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((team) => {
            const teamMembers = members.filter((m) => m.team_id === team.id);
            const leader = team.leader_id
              ? profilesById.get(team.leader_id)
              : null;
            const people = teamMembers
              .map((m) => profilesById.get(m.user_id))
              .filter((p): p is Profile => !!p)
              .sort((a, b) => {
                if (a.id === team.leader_id) return -1;
                if (b.id === team.leader_id) return 1;
                return (
                  Number(b.power_score || 0) - Number(a.power_score || 0) ||
                  a.full_name.localeCompare(b.full_name, "vi")
                );
              });
            const teamPower = people.reduce(
              (s, p) => s + Number(p.power_score || 0),
              0
            );
            const avgPower =
              people.length > 0 ? Math.round(teamPower / people.length) : 0;

            return (
              <div
                key={team.id}
                className="group relative overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-border/70 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: team.color }}
                />
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: team.color }}
                      />
                      <h3 className="truncate font-display text-lg font-semibold tracking-tight">
                        {team.name}
                      </h3>
                    </div>
                    {team.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {team.description}
                      </p>
                    )}
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(team)}
                      >
                        <Pencil className="!size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => remove(team)}
                      >
                        <Trash2 className="!size-3.5 text-rose-500" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Crown size={12} className="text-amber-500" />
                  <span className="truncate">
                    Leader:{" "}
                    <span className="font-medium text-foreground">
                      {leader?.full_name ?? "—"}
                    </span>
                  </span>
                  <Badge variant="secondary" className="ml-auto py-0 text-[10px]">
                    {people.length} người
                  </Badge>
                </div>

                {people.length > 0 && (
                  <div className="mb-3 rounded-xl bg-muted/30 px-3 py-2 ring-1 ring-border/40">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Tổng lực chiến
                      </span>
                      <span className="tnum font-semibold tabular-nums">
                        {teamPower}{" "}
                        <span className="font-normal text-muted-foreground">
                          · TB {avgPower}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, avgPower)}%`,
                          background: team.color,
                        }}
                      />
                    </div>
                  </div>
                )}

                {people.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">
                    Chưa có thành viên
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {people.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 py-0.5 pl-0.5 pr-2 ring-1 ring-border/50"
                        title={p.job_role}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">
                            {p.full_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[6rem] truncate text-[11px]">
                          {p.full_name}
                        </span>
                        <span className="tnum text-[10px] text-muted-foreground">
                          {Math.round(Number(p.power_score) || 0)}
                        </span>
                        {p.id === team.leader_id && (
                          <Crown size={10} className="shrink-0 text-amber-500" />
                        )}
                      </div>
                    ))}
                    {people.length > 8 && (
                      <span className="self-center text-[11px] text-muted-foreground">
                        +{people.length - 8}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa team" : "Tạo team mới"}
            </DialogTitle>
            <DialogDescription>
              Team là nhóm tổ chức — không liên quan phân bổ dự án.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-4">
              <FieldGrid>
                <Field>
                  <Label htmlFor="team_name">Tên team</Label>
                  <Input
                    id="team_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="VD: Platform, Delivery A…"
                  />
                </Field>
                <Field>
                  <Label>Màu</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {TEAM_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "h-7 w-7 rounded-full ring-offset-2 transition",
                          color === c
                            ? "ring-2 ring-foreground"
                            : "ring-1 ring-border/60"
                        )}
                        style={{ background: c }}
                        aria-label={`Chọn màu ${c}`}
                      />
                    ))}
                  </div>
                </Field>
              </FieldGrid>

              <Field>
                <Label htmlFor="team_desc">Mô tả</Label>
                <Textarea
                  id="team_desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Tuỳ chọn"
                />
              </Field>

              <Field>
                <Label>Leader</Label>
                <Select value={leaderId} onValueChange={onLeaderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProfiles.map((p) => {
                      const otherTeam = memberTeamByUser.get(p.id);
                      const conflict =
                        otherTeam && otherTeam !== editing?.id;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                          {conflict ? " · đang ở team khác" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label>Thành viên</Label>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl bg-muted/30 p-2 ring-1 ring-border/50">
                  {activeProfiles.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                      Chưa có nhân sự active.
                    </p>
                  ) : (
                    activeProfiles.map((p) => {
                      const checked =
                        memberIds.includes(p.id) || p.id === leaderId;
                      const otherTeam = memberTeamByUser.get(p.id);
                      const conflict =
                        otherTeam &&
                        otherTeam !== editing?.id &&
                        !checked;
                      return (
                        <label
                          key={p.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-background/80",
                            checked && "bg-background shadow-sm ring-1 ring-border/60"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="accent-teal-600"
                            checked={checked}
                            disabled={p.id === leaderId}
                            onChange={() => toggleMember(p.id)}
                          />
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">
                              {p.full_name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">
                              {p.full_name}
                              {p.id === leaderId && (
                                <span className="ml-1.5 text-[10px] font-normal text-amber-600">
                                  Leader
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {p.job_role}
                              {conflict
                                ? " · chuyển từ team khác khi lưu"
                                : ""}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Mỗi người chỉ thuộc 1 team. Leader luôn là thành viên.
                </p>
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Huỷ
              </Button>
              <Button type="submit" variant="brand" disabled={saving}>
                {saving ? "Đang lưu…" : editing ? "Lưu" : "Tạo team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border/70">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold tracking-tight tnum">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

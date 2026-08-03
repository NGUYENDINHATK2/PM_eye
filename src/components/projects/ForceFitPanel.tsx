"use client";

import { AiCoachCard, useAiCoach } from "@/components/ai/AiCoachCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forceFitTone,
  projectForceFit,
  suggestDifficultyFromPhases,
  type ProjectForceFit,
} from "@/lib/force-fit";
import { cn, formatPercent } from "@/lib/utils";
import type { Allocation, Profile, Project, ProjectPhase } from "@/types/database";
import { Bot, Flame, Gauge, Loader2, Pencil, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function ForceFitPanel({
  project,
  allocations,
  allAllocations,
  profiles,
  phases,
  canEdit,
  onDifficultySaved,
}: {
  project: Project;
  /** Allocations của dự án này */
  allocations: Allocation[];
  /** Toàn bộ alloc (để tính load cá nhân) */
  allAllocations: Allocation[];
  profiles: Profile[];
  phases: ProjectPhase[];
  canEdit: boolean;
  onDifficultySaved?: (difficulty: number) => void;
}) {
  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const fit = useMemo(
    () =>
      projectForceFit(
        project,
        allocations,
        profilesById,
        allAllocations,
        new Date(),
        phases
      ),
    [project, allocations, profilesById, allAllocations, phases]
  );

  const tone = forceFitTone(fit.verdict);
  const suggested = suggestDifficultyFromPhases(phases);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(project.difficulty || ""));
  const [saving, setSaving] = useState(false);
  const ai = useAiCoach("/api/ai/project-advice");

  async function saveDifficulty(value: number) {
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .update({ difficulty: value })
        .eq("id", project.id);
      if (error) throw new Error(error.message);
      onDifficultySaved?.(value);
      toast.success(
        value > 0 ? `Đã đặt độ khó ${value}` : "Đã bỏ độ khó dự án"
      );
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  // Thanh: so P_avg với D (cùng thang 1–100) — ổn định
  const fillPct =
    fit.difficulty > 0
      ? Math.min(120, (fit.avgPower / fit.difficulty) * 100)
      : Math.min(100, fit.avgPower);

  return (
    <div className={cn("rounded-2xl p-5 ring-1", tone.bg)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Gauge size={16} className={tone.text} />
            <h3 className="font-display text-base font-semibold tracking-tight">
              Lực chiến dự án
            </h3>
            <Badge variant={tone.badge}>{fit.label}</Badge>
          </div>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            {fit.hint}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/80">
            Fit = LC trung bình team ÷ độ khó (cùng thang 1–100)
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="brand"
              disabled={ai.loading}
              onClick={() => void ai.run({ projectId: project.id })}
            >
              {ai.loading ? (
                <Loader2 className="!size-3.5 animate-spin" />
              ) : (
                <Bot className="!size-3.5" />
              )}
              {ai.loading ? "Đang phân tích…" : "AI Coach"}
            </Button>
            {!editing ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDraft(
                    String(project.difficulty > 0 ? project.difficulty : "")
                  );
                  setEditing(true);
                }}
              >
                <Pencil className="!size-3.5" />
                Độ khó
              </Button>
            ) : (
              <div className="flex flex-wrap items-end gap-2 rounded-xl bg-background/80 p-2 ring-1 ring-border/60">
                <div className="space-y-1">
                  <Label className="text-[10px]">
                    Độ khó = LC TB cần (1–100)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-9 w-24"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="55"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft(String(suggested))}
                  title="Gợi ý LC TB theo role yêu cầu trên phase"
                >
                  <Sparkles className="!size-3.5" />
                  Gợi ý {suggested}
                </Button>
                <Button
                  size="sm"
                  variant="brand"
                  disabled={saving}
                  onClick={() => {
                    const n = Math.min(
                      100,
                      Math.max(0, Math.round(Number(draft) || 0))
                    );
                    void saveDifficulty(n);
                  }}
                >
                  Lưu
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                >
                  Huỷ
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="LC trung bình"
          value={fit.avgPower > 0 ? String(fit.avgPower) : "—"}
          hint="P_avg = Σ(LC×%) / FTE"
          icon={<Flame size={12} />}
        />
        <Stat
          label="Độ khó"
          value={fit.difficulty > 0 ? String(fit.difficulty) : "—"}
          hint={
            fit.difficulty > 0
              ? "Mức LC TB yêu cầu"
              : "Junior 50 · Middle 65 · Senior 80"
          }
        />
        <Stat
          label="Fit chất lượng"
          value={
            fit.qualityFit != null
              ? `${Math.round(fit.qualityFit * 100)}%`
              : "—"
          }
          hint="P_avg ÷ độ khó"
        />
        <Stat
          label="Nhân sự"
          value={
            fit.staffFit != null
              ? `${Math.round(fit.staffFit * 100)}%`
              : `${fit.fte} FTE`
          }
          hint={
            fit.requiredFte > 0
              ? `${fit.fte} / cần ${fit.requiredFte} FTE`
              : `${fit.headcount} người · ${fit.fte} FTE`
          }
          warn={
            fit.overloadedCount > 0 ||
            (fit.staffFit != null && fit.staffFit < 0.75)
          }
        />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span>Khớp độ khó (LC TB vs yêu cầu)</span>
          <span className="tnum">
            {fit.difficulty > 0
              ? `${fit.avgPower} / ${fit.difficulty}`
              : `LC TB ${fit.avgPower || "—"}`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background/60 ring-1 ring-border/40">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, fillPct)}%`,
              background: tone.bar,
            }}
          />
        </div>
      </div>

      {fit.byRole.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Theo role
          </div>
          <div className="flex flex-wrap gap-2">
            {fit.byRole.map((r) => (
              <div
                key={r.role}
                className="inline-flex items-center gap-2 rounded-full bg-background/70 px-2.5 py-1 text-[11px] ring-1 ring-border/50"
              >
                <span className="font-medium">{r.role}</span>
                <span className="text-muted-foreground">
                  {formatPercent(r.fte)}
                </span>
                <span className="tnum font-semibold tabular-nums">
                  TB {r.avgPower}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AiCoachCard
        className="mt-4"
        title="AI Coach · Dự án"
        loading={ai.loading}
        error={ai.error}
        result={ai.result}
        onRegenerate={() => void ai.run({ projectId: project.id })}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl bg-background/60 px-3 py-2.5 ring-1 ring-border/40">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-display text-xl font-semibold tracking-tight tnum",
          warn && "text-amber-600 dark:text-amber-400"
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Badge gọn cho card danh sách dự án */
export function ForceFitBadge({ fit }: { fit: ProjectForceFit }) {
  const tone = forceFitTone(fit.verdict);
  if (fit.verdict === "empty") return null;
  return (
    <Badge variant={tone.badge} className="gap-1 text-[10px]">
      <Flame size={10} />
      {fit.verdict === "overloaded"
        ? "Quá tải"
        : fit.verdict === "understaffed"
          ? "Thiếu người"
          : fit.qualityFit != null
            ? `Fit ${Math.round(fit.qualityFit * 100)}%`
            : `TB ${fit.avgPower}`}
    </Badge>
  );
}

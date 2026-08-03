import type { ProjectPhase } from "@/types/database";

/** Trạng thái phase chuẩn (lưu DB). */
export const PHASE_STATUS_OPTIONS = [
  "planning",
  "active",
  "done",
] as const;

export type PhaseStatus = (typeof PHASE_STATUS_OPTIONS)[number];

/** Trạng thái hiển thị — thêm delayed (tính, không lưu). */
export type EffectivePhaseStatus = PhaseStatus | "delayed";

export function isPhaseStatus(v: unknown): v is PhaseStatus {
  return (
    typeof v === "string" &&
    (PHASE_STATUS_OPTIONS as readonly string[]).includes(v)
  );
}

export function normalizePhaseStatus(raw: string | null | undefined): PhaseStatus {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "planning" || v === "planned" || v === "todo") return "planning";
  if (v === "active" || v === "ongoing" || v === "in_progress" || v === "doing")
    return "active";
  if (v === "done" || v === "completed" || v === "closed") return "done";
  return "planning";
}

export function phaseStatusLabel(status: EffectivePhaseStatus): string {
  switch (status) {
    case "planning":
      return "Planning";
    case "active":
      return "Active";
    case "done":
      return "Done";
    case "delayed":
      return "Trễ";
  }
}

export function effectivePhaseStatus(
  phase: Pick<ProjectPhase, "status" | "start_date" | "end_date">,
  asOf: Date = new Date()
): EffectivePhaseStatus {
  const base = normalizePhaseStatus(phase.status);
  if (base === "done") return "done";
  const end = new Date(phase.end_date);
  if (end < asOf) return "delayed";
  const start = new Date(phase.start_date);
  if (asOf >= start && asOf <= end) {
    // Đang trong khoảng ngày — ưu tiên active nếu DB còn planning
    return base === "planning" ? "active" : base;
  }
  return base;
}

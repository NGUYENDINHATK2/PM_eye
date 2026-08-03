/** Level kinh nghiệm — tách khỏi job_role (FE/BA/QA…). */

export const LEVEL_OPTIONS = [
  "Intern",
  "Fresher",
  "Junior",
  "Middle",
  "Senior",
  "Lead",
  "Principal",
] as const;

export type DevLevel = (typeof LEVEL_OPTIONS)[number];

/** Lực chiến mặc định theo level (1–100). Có thể chỉnh tay. */
export const DEFAULT_POWER_BY_LEVEL: Record<DevLevel, number> = {
  Intern: 20,
  Fresher: 35,
  Junior: 50,
  Middle: 65,
  Senior: 80,
  Lead: 90,
  Principal: 100,
};

export function isDevLevel(v: unknown): v is DevLevel {
  return typeof v === "string" && (LEVEL_OPTIONS as readonly string[]).includes(v);
}

export function defaultPowerForLevel(level: string | null | undefined): number {
  if (isDevLevel(level)) return DEFAULT_POWER_BY_LEVEL[level];
  return 50;
}

export function clampPower(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(1, Math.round(n)));
}

export function levelLabel(level: string | null | undefined): string {
  return isDevLevel(level) ? level : level?.trim() || "—";
}

/** Màu badge theo level (CSS-friendly). */
export function levelTone(level: string | null | undefined): {
  text: string;
  bg: string;
  ring: string;
} {
  switch (level) {
    case "Intern":
      return {
        text: "text-slate-600 dark:text-slate-300",
        bg: "bg-slate-500/10",
        ring: "ring-slate-500/20",
      };
    case "Fresher":
      return {
        text: "text-sky-700 dark:text-sky-300",
        bg: "bg-sky-500/10",
        ring: "ring-sky-500/20",
      };
    case "Junior":
      return {
        text: "text-teal-700 dark:text-teal-300",
        bg: "bg-teal-500/10",
        ring: "ring-teal-500/20",
      };
    case "Middle":
      return {
        text: "text-cyan-700 dark:text-cyan-300",
        bg: "bg-cyan-500/10",
        ring: "ring-cyan-500/20",
      };
    case "Senior":
      return {
        text: "text-amber-700 dark:text-amber-300",
        bg: "bg-amber-500/10",
        ring: "ring-amber-500/20",
      };
    case "Lead":
      return {
        text: "text-violet-700 dark:text-violet-300",
        bg: "bg-violet-500/10",
        ring: "ring-violet-500/20",
      };
    case "Principal":
      return {
        text: "text-rose-700 dark:text-rose-300",
        bg: "bg-rose-500/10",
        ring: "ring-rose-500/20",
      };
    default:
      return {
        text: "text-muted-foreground",
        bg: "bg-muted",
        ring: "ring-border/50",
      };
  }
}

/** Thanh lực chiến: màu theo điểm. */
export function powerBarColor(score: number): string {
  if (score >= 85) return "#a78bfa"; // lead+
  if (score >= 70) return "#f59e0b"; // senior
  if (score >= 55) return "#06b6d4"; // middle
  if (score >= 40) return "#14b8a6"; // junior
  if (score >= 25) return "#38bdf8"; // fresher
  return "#94a3b8"; // intern
}

/**
 * Hiệu suất lực chiến / lương — hệ quy chiếu = Lead.
 *
 * index = (LC / LC_Lead) / (Lương / Lương_Lead)
 *       = (LC × Lương_Lead) / (LC_Lead × Lương)
 *
 * = 1 → ngang Lead (cùng LC trên mỗi đồng lương)
 * > 1 → "rẻ" hơn Lead (nhiều LC hơn mỗi đồng)
 * < 1 → "đắt" hơn Lead
 */

import {
  DEFAULT_POWER_BY_LEVEL,
  clampPower,
  isDevLevel,
} from "@/lib/levels";
import type { Profile } from "@/types/database";

export const LEAD_POWER_REF = DEFAULT_POWER_BY_LEVEL.Lead; // 90

export type LeadSalaryRef = {
  /** Lương Lead dùng làm mốc (median các Lead active có lương) */
  salary: number;
  /** LC Lead (mặc định 90; nếu có Lead thật → TB LC của họ) */
  power: number;
  /** Số Lead dùng để tính mốc */
  sampleSize: number;
};

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1]! + a[mid]!) / 2 : a[mid]!;
}

/** Lấy hệ quy chiếu từ danh sách profile (ưu tiên Lead active có lương > 0). */
export function resolveLeadSalaryRef(
  profiles: Pick<Profile, "level" | "base_salary" | "power_score" | "is_active">[]
): LeadSalaryRef | null {
  const leads = profiles.filter(
    (p) =>
      p.is_active !== false &&
      isDevLevel(p.level) &&
      p.level === "Lead" &&
      Number(p.base_salary) > 0
  );
  if (leads.length === 0) return null;

  const salaries = leads.map((p) => Number(p.base_salary));
  const powers = leads.map((p) =>
    Number(p.power_score) > 0
      ? clampPower(Number(p.power_score))
      : LEAD_POWER_REF
  );

  return {
    salary: median(salaries),
    power:
      powers.reduce((s, n) => s + n, 0) / Math.max(1, powers.length) ||
      LEAD_POWER_REF,
    sampleSize: leads.length,
  };
}

export type PowerSalaryIndex = {
  /** (LC/LC_Lead) / (Lương/Lương_Lead) — null nếu thiếu data */
  index: number | null;
  /** Lương / Lương_Lead */
  salaryRatio: number | null;
  /** LC / LC_Lead */
  powerRatio: number | null;
  /** LC trên mỗi triệu VND lương */
  lcPerMillion: number | null;
};

export function powerSalaryIndex(
  power: number,
  salary: number,
  ref: LeadSalaryRef | null
): PowerSalaryIndex {
  const p = Number(power);
  const s = Number(salary);
  const lcPerMillion =
    Number.isFinite(p) && p > 0 && Number.isFinite(s) && s > 0
      ? p / (s / 1_000_000)
      : null;

  if (!ref || ref.salary <= 0 || ref.power <= 0) {
    return { index: null, salaryRatio: null, powerRatio: null, lcPerMillion };
  }
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(s) || s <= 0) {
    return { index: null, salaryRatio: null, powerRatio: null, lcPerMillion };
  }

  const salaryRatio = s / ref.salary;
  const powerRatio = p / ref.power;
  const index = powerRatio / salaryRatio;

  return { index, salaryRatio, powerRatio, lcPerMillion };
}

/** Nhãn ngắn cho UI. */
export function powerSalaryLabel(index: number | null): {
  short: string;
  tone: "good" | "ok" | "warn" | "bad" | "muted";
  hint: string;
} {
  if (index == null || !Number.isFinite(index)) {
    return {
      short: "—",
      tone: "muted",
      hint: "Thiếu lương hoặc chưa có Lead làm mốc",
    };
  }
  if (index >= 1.25) {
    return {
      short: "Rẻ vs Lead",
      tone: "good",
      hint: "Nhiều LC hơn mỗi đồng lương so với Lead",
    };
  }
  if (index >= 0.9) {
    return {
      short: "Ngang Lead",
      tone: "ok",
      hint: "Tỷ lệ LC/lương gần hệ quy chiếu Lead",
    };
  }
  if (index >= 0.7) {
    return {
      short: "Hơi đắt",
      tone: "warn",
      hint: "Ít LC hơn mỗi đồng lương so với Lead",
    };
  }
  return {
    short: "Đắt vs Lead",
    tone: "bad",
    hint: "LC thấp so với mức lương (chuẩn Lead)",
  };
}

export function formatPowerSalaryIndex(index: number | null): string {
  if (index == null || !Number.isFinite(index)) return "—";
  return `×${index.toFixed(2)}`;
}

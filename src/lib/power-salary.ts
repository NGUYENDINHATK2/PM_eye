/**
 * Hiệu suất lực chiến / lương — hệ quy chiếu = người lương cao nhất.
 *
 * index = (LC / LC_mốc) / (Lương / Lương_mốc)
 *       = (LC × Lương_mốc) / (LC_mốc × Lương)
 *
 * = 1 → ngang người lương cao nhất (cùng LC trên mỗi đồng)
 * > 1 → "rẻ" hơn (nhiều LC hơn mỗi đồng)
 * < 1 → "đắt" hơn
 */

import { clampPower } from "@/lib/levels";
import type { Profile } from "@/types/database";

export type SalaryPowerRef = {
  /** Lương cao nhất (active, > 0) */
  salary: number;
  /** LC của đúng người đó */
  power: number;
  /** Tên người làm mốc (hiển thị UI) */
  name: string | null;
  profileId: string | null;
};

/** Lấy hệ quy chiếu = nhân sự active có lương cao nhất. */
export function resolveTopSalaryRef(
  profiles: Pick<
    Profile,
    "id" | "full_name" | "base_salary" | "power_score" | "is_active"
  >[]
): SalaryPowerRef | null {
  let best: (typeof profiles)[number] | null = null;
  let bestSalary = 0;

  for (const p of profiles) {
    if (p.is_active === false) continue;
    const s = Number(p.base_salary);
    if (!Number.isFinite(s) || s <= 0) continue;
    const power =
      Number(p.power_score) > 0 ? clampPower(Number(p.power_score)) : 0;
    if (
      s > bestSalary ||
      (s === bestSalary &&
        best &&
        power > (Number(best.power_score) > 0 ? Number(best.power_score) : 0))
    ) {
      bestSalary = s;
      best = p;
    }
  }

  if (!best || bestSalary <= 0) return null;

  const power =
    Number(best.power_score) > 0
      ? clampPower(Number(best.power_score))
      : 50;

  return {
    salary: bestSalary,
    power,
    name: best.full_name?.trim() || null,
    profileId: best.id,
  };
}

/** @deprecated dùng resolveTopSalaryRef */
export const resolveLeadSalaryRef = resolveTopSalaryRef;
/** @deprecated dùng SalaryPowerRef */
export type LeadSalaryRef = SalaryPowerRef;

export type PowerSalaryIndex = {
  /** (LC/LC_mốc) / (Lương/Lương_mốc) — null nếu thiếu data */
  index: number | null;
  /** Lương / Lương_mốc */
  salaryRatio: number | null;
  /** LC / LC_mốc */
  powerRatio: number | null;
  /** LC trên mỗi triệu VND lương */
  lcPerMillion: number | null;
};

export function powerSalaryIndex(
  power: number,
  salary: number,
  ref: SalaryPowerRef | null
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
      hint: "Thiếu lương hoặc chưa có người làm mốc",
    };
  }
  if (index >= 1.25) {
    return {
      short: "Rẻ vs mốc",
      tone: "good",
      hint: "Nhiều LC hơn mỗi đồng lương so với người lương cao nhất",
    };
  }
  if (index >= 0.9) {
    return {
      short: "Ngang mốc",
      tone: "ok",
      hint: "Tỷ lệ LC/lương gần người lương cao nhất",
    };
  }
  if (index >= 0.7) {
    return {
      short: "Hơi đắt",
      tone: "warn",
      hint: "Ít LC hơn mỗi đồng lương so với mốc lương cao nhất",
    };
  }
  return {
    short: "Đắt vs mốc",
    tone: "bad",
    hint: "LC thấp so với mức lương (chuẩn người lương cao nhất)",
  };
}

export function formatPowerSalaryIndex(index: number | null): string {
  if (index == null || !Number.isFinite(index)) return "—";
  return `×${index.toFixed(2)}`;
}

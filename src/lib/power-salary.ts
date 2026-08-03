/**
 * LC vs lương — phục vụ điều chỉnh lương.
 *
 * LC/triệu = power / (salary / 1e6)
 * score    = (LC/triệu của người) / (median LC/triệu toàn team active)
 *
 * > 1 → đang "rẻ" (nhiều LC mỗi triệu hơn median) → cân nhắc tăng lương
 * ≈ 1 → ngang team
 * < 1 → đang "đắt" (ít LC mỗi triệu hơn median) → xem lại mức lương / LC
 */

import { clampPower } from "@/lib/levels";
import type { Profile } from "@/types/database";

export type EfficiencyVerdict = "re" | "on" | "dat" | "—";

export type EfficiencyResult = {
  /** So với median team (1 = ngang) */
  score: number | null;
  verdict: EfficiencyVerdict;
  /** LC trên mỗi triệu VND */
  lcPerMillion: number | null;
};

export type PayEfficiencyRef = {
  /** Median LC/triệu của team active có lương */
  medianLcPerMillion: number;
  sampleSize: number;
};

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1]! + a[mid]!) / 2 : a[mid]!;
}

export function lcPerMillion(
  power: number,
  salary: number
): number | null {
  const p = Number(power);
  const s = Number(salary);
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(s) || s <= 0) {
    return null;
  }
  return clampPower(p) / (s / 1_000_000);
}

type ProfileLite = Pick<
  Profile,
  "base_salary" | "power_score" | "is_active"
>;

/** Mốc so sánh = median LC/triệu cả team (không theo level). */
export function buildPayEfficiencyRef(
  profiles: ProfileLite[]
): PayEfficiencyRef | null {
  const values: number[] = [];
  for (const p of profiles) {
    if (p.is_active === false) continue;
    const v = lcPerMillion(Number(p.power_score), Number(p.base_salary));
    if (v != null) values.push(v);
  }
  if (values.length === 0) return null;
  return {
    medianLcPerMillion: median(values),
    sampleSize: values.length,
  };
}

/** @deprecated alias — UI cũ */
export const buildLevelPayBands = buildPayEfficiencyRef;

export function efficiencyVerdict(score: number | null): EfficiencyVerdict {
  if (score == null || !Number.isFinite(score)) return "—";
  if (score >= 1.15) return "re"; // rẻ hơn median → nhiều LC/đồng
  if (score >= 0.85) return "on";
  return "dat";
}

export function efficiencyLabel(verdict: EfficiencyVerdict): string {
  switch (verdict) {
    case "re":
      return "Rẻ";
    case "on":
      return "Ổn";
    case "dat":
      return "Đắt";
    default:
      return "—";
  }
}

export function personEfficiency(
  power: number,
  salary: number,
  _level: string | null | undefined,
  ref: PayEfficiencyRef | null
): EfficiencyResult {
  const empty: EfficiencyResult = {
    score: null,
    verdict: "—",
    lcPerMillion: null,
  };

  const lpm = lcPerMillion(power, salary);
  if (lpm == null) return empty;
  if (!ref || ref.medianLcPerMillion <= 0) {
    return { score: null, verdict: "—", lcPerMillion: lpm };
  }

  const score = lpm / ref.medianLcPerMillion;
  return {
    score,
    verdict: efficiencyVerdict(score),
    lcPerMillion: lpm,
  };
}

export function formatEfficiencyScore(score: number | null): string {
  if (score == null || !Number.isFinite(score)) return "—";
  // Một số gọn: 1.26 → 1.3
  return score.toFixed(1);
}

export function formatLcPerMillion(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

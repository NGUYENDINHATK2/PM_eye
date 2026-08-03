/**
 * LC vs lương — so với khung lương theo level (không so junior).
 *
 * score = (LC / LC_chuẩn_level) / (Lương / khung_lương_level)
 *
 * > 1 → lương thấp so với LC·level → cân nhắc tăng
 * ≈ 1 → đúng khung
 * < 1 → lương cao so với LC·level
 *
 * Ví dụ Principal LC 100 · 20tr · khung 32tr → 1 / (20/32) = 1.6
 */

import {
  clampPower,
  defaultPowerForLevel,
  isDevLevel,
  type DevLevel,
} from "@/lib/levels";

/** Khung lương / tháng (VND) theo level — chỉnh cho khớp công ty. */
export const SALARY_BAND_BY_LEVEL: Record<DevLevel, number> = {
  Intern: 5_000_000,
  Fresher: 9_000_000,
  Junior: 12_000_000,
  Middle: 18_000_000,
  Senior: 25_000_000,
  Lead: 30_000_000,
  Principal: 32_000_000,
};

export type EfficiencyVerdict = "re" | "on" | "dat" | "—";

export type EfficiencyResult = {
  score: number | null;
  verdict: EfficiencyVerdict;
  lcPerMillion: number | null;
};

export function salaryBandForLevel(
  level: string | null | undefined
): number | null {
  if (!isDevLevel(level)) return null;
  return SALARY_BAND_BY_LEVEL[level];
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

export function efficiencyVerdict(score: number | null): EfficiencyVerdict {
  if (score == null || !Number.isFinite(score)) return "—";
  if (score >= 1.15) return "re";
  if (score >= 0.85) return "on";
  return "dat";
}

export function personEfficiency(
  power: number,
  salary: number,
  level: string | null | undefined,
  _ref?: unknown
): EfficiencyResult {
  const empty: EfficiencyResult = {
    score: null,
    verdict: "—",
    lcPerMillion: null,
  };

  const p = Number(power);
  const s = Number(salary);
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(s) || s <= 0) {
    return empty;
  }
  if (!isDevLevel(level)) return empty;

  const stdLc = defaultPowerForLevel(level);
  const band = SALARY_BAND_BY_LEVEL[level];
  if (stdLc <= 0 || band <= 0) return empty;

  const lcFit = clampPower(p) / stdLc;
  const payFit = s / band;
  if (payFit <= 0) return empty;

  const score = lcFit / payFit;
  return {
    score,
    verdict: efficiencyVerdict(score),
    lcPerMillion: lcPerMillion(p, s),
  };
}

export function formatEfficiencyScore(score: number | null): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return score.toFixed(1);
}

/** Giữ API cũ — không dùng mốc team nữa. */
export function buildPayEfficiencyRef(_profiles?: unknown) {
  return null;
}

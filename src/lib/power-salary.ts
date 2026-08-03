/**
 * Hiệu suất theo Level + LC + Lương.
 *
 * Chuẩn LC  = default LC của level (Intern 20 … Principal 100)
 * Chuẩn lương = median lương cùng level trong team (active, có lương)
 *             fallback: median(lương / LC_chuẩn_level) × LC_chuẩn của người đó
 *
 * score = (LC / LC_chuẩn) / (Lương / Lương_chuẩn)
 *
 * ≈ 1 → đúng chuẩn level (ổn)
 * > 1 → LC cao hơn mức lương đang trả (tốt)
 * < 1 → lương cao so với LC/level (thấp / đắt)
 */

import {
  clampPower,
  defaultPowerForLevel,
  isDevLevel,
  type DevLevel,
} from "@/lib/levels";
import type { Profile } from "@/types/database";

export type EfficiencyVerdict = "tot" | "on" | "thap" | "—";

export type EfficiencyResult = {
  score: number | null;
  verdict: EfficiencyVerdict;
  /** LC / LC_chuẩn_level */
  lcFit: number | null;
  /** Lương / Lương_chuẩn_level */
  payFit: number | null;
};

export type LevelPayBand = {
  level: DevLevel;
  medianSalary: number;
  sampleSize: number;
};

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1]! + a[mid]!) / 2 : a[mid]!;
}

type ProfileLite = Pick<
  Profile,
  "level" | "base_salary" | "power_score" | "is_active"
>;

/** Median lương theo từng level (active, lương > 0). */
export function buildLevelPayBands(profiles: ProfileLite[]): {
  byLevel: Map<DevLevel, LevelPayBand>;
  /** median(lương / LC_chuẩn) toàn team — fallback khi level chưa đủ sample */
  companyPayPerStandardLc: number | null;
} {
  const buckets = new Map<DevLevel, number[]>();
  const payPerStd: number[] = [];

  for (const p of profiles) {
    if (p.is_active === false) continue;
    const salary = Number(p.base_salary);
    if (!Number.isFinite(salary) || salary <= 0) continue;
    if (!isDevLevel(p.level)) continue;

    const list = buckets.get(p.level) ?? [];
    list.push(salary);
    buckets.set(p.level, list);

    const stdLc = defaultPowerForLevel(p.level);
    if (stdLc > 0) payPerStd.push(salary / stdLc);
  }

  const byLevel = new Map<DevLevel, LevelPayBand>();
  for (const [level, salaries] of buckets) {
    byLevel.set(level, {
      level,
      medianSalary: median(salaries),
      sampleSize: salaries.length,
    });
  }

  return {
    byLevel,
    companyPayPerStandardLc:
      payPerStd.length > 0 ? median(payPerStd) : null,
  };
}

function expectedSalaryForLevel(
  level: DevLevel,
  bands: ReturnType<typeof buildLevelPayBands>
): number | null {
  const band = bands.byLevel.get(level);
  // ≥1 người cùng level có lương → dùng median level (kể cả chính họ)
  if (band && band.medianSalary > 0) return band.medianSalary;

  const stdLc = defaultPowerForLevel(level);
  if (bands.companyPayPerStandardLc && stdLc > 0) {
    return bands.companyPayPerStandardLc * stdLc;
  }
  return null;
}

export function efficiencyVerdict(score: number | null): EfficiencyVerdict {
  if (score == null || !Number.isFinite(score)) return "—";
  if (score >= 1.15) return "tot";
  if (score >= 0.85) return "on";
  return "thap";
}

export function efficiencyLabel(verdict: EfficiencyVerdict): string {
  switch (verdict) {
    case "tot":
      return "Tốt";
    case "on":
      return "Ổn";
    case "thap":
      return "Thấp";
    default:
      return "—";
  }
}

export function personEfficiency(
  power: number,
  salary: number,
  level: string | null | undefined,
  bands: ReturnType<typeof buildLevelPayBands>
): EfficiencyResult {
  const empty: EfficiencyResult = {
    score: null,
    verdict: "—",
    lcFit: null,
    payFit: null,
  };

  const p = Number(power);
  const s = Number(salary);
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(s) || s <= 0) {
    return empty;
  }
  if (!isDevLevel(level)) return empty;

  const stdLc = defaultPowerForLevel(level);
  const expectedPay = expectedSalaryForLevel(level, bands);
  if (!expectedPay || expectedPay <= 0 || stdLc <= 0) return empty;

  const lcFit = clampPower(p) / stdLc;
  const payFit = s / expectedPay;
  if (payFit <= 0) return empty;

  const score = lcFit / payFit;
  return {
    score,
    verdict: efficiencyVerdict(score),
    lcFit,
    payFit,
  };
}

export function formatEfficiencyScore(score: number | null): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return score.toFixed(2);
}

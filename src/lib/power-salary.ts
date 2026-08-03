/**
 * LC vs lương — điều chỉnh lương theo level.
 *
 * score = (LC / LC_chuẩn_level) / (Lương / khung_level)
 *
 * Khung level (dynamic):
 *   ≥2 người active cùng level có lương → median lương level đó
 *   (không thấp hơn DEFAULT_BAND)
 *   còn lại → DEFAULT_BAND[level]
 *
 * > 1 → lương thấp so với LC·khung → cân nhắc tăng
 * ≈ 1 → đúng khung
 * < 1 → lương cao so với LC·khung
 */

import {
  clampPower,
  defaultPowerForLevel,
  isDevLevel,
  type DevLevel,
} from "@/lib/levels";
import type { Profile } from "@/types/database";

/** Sàn khung lương / tháng khi chưa đủ data cùng level. */
export const DEFAULT_SALARY_BAND: Record<DevLevel, number> = {
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

export type LevelBandRef = {
  byLevel: Map<DevLevel, { band: number; sampleSize: number; source: "peers" | "default" }>;
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

/** Build khung lương dynamic theo data team. */
export function buildLevelBandRef(profiles: ProfileLite[]): LevelBandRef {
  const buckets = new Map<DevLevel, number[]>();
  for (const p of profiles) {
    if (p.is_active === false) continue;
    if (!isDevLevel(p.level)) continue;
    const s = Number(p.base_salary);
    if (!Number.isFinite(s) || s <= 0) continue;
    const list = buckets.get(p.level) ?? [];
    list.push(s);
    buckets.set(p.level, list);
  }

  const byLevel = new Map<
    DevLevel,
    { band: number; sampleSize: number; source: "peers" | "default" }
  >();

  for (const level of Object.keys(DEFAULT_SALARY_BAND) as DevLevel[]) {
    const floor = DEFAULT_SALARY_BAND[level];
    const peers = buckets.get(level) ?? [];
    if (peers.length >= 2) {
      const med = median(peers);
      byLevel.set(level, {
        band: Math.max(floor, med),
        sampleSize: peers.length,
        source: "peers",
      });
    } else {
      byLevel.set(level, {
        band: floor,
        sampleSize: peers.length,
        source: "default",
      });
    }
  }

  return { byLevel };
}

export function bandForLevel(
  level: string | null | undefined,
  ref: LevelBandRef | null | undefined
): number | null {
  if (!isDevLevel(level)) return null;
  const fromRef = ref?.byLevel.get(level)?.band;
  if (fromRef && fromRef > 0) return fromRef;
  return DEFAULT_SALARY_BAND[level];
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
  ref?: LevelBandRef | null
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
  const band = bandForLevel(level, ref);
  if (!band || stdLc <= 0) return empty;

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

/** @deprecated */
export function buildPayEfficiencyRef(profiles: ProfileLite[]) {
  return buildLevelBandRef(profiles);
}

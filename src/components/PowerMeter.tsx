"use client";

import { levelTone, powerBarColor } from "@/lib/levels";
import { cn } from "@/lib/utils";

/** Badge level + thanh lực chiến gọn. */
export function PowerMeter({
  level,
  power,
  compact = false,
  className,
}: {
  level?: string | null;
  power: number;
  compact?: boolean;
  className?: string;
}) {
  const score = Math.min(100, Math.max(0, Number(power) || 0));
  const tone = levelTone(level);
  const bar = powerBarColor(score);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 min-w-0", className)}>
        {level && (
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1",
              tone.text,
              tone.bg,
              tone.ring
            )}
          >
            {level}
          </span>
        )}
        <span className="tnum text-[11px] font-semibold tabular-nums text-foreground">
          {score}
        </span>
        <div className="h-1 w-10 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${score}%`, background: bar }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-medium ring-1",
            tone.text,
            tone.bg,
            tone.ring
          )}
        >
          {level || "—"}
        </span>
        <span className="tnum font-semibold tabular-nums">
          LC {score}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: bar }}
        />
      </div>
    </div>
  );
}

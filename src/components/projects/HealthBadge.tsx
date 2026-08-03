"use client";

import {
  healthDotClass,
  healthToneClass,
  type ProjectHealthScore,
} from "@/lib/project-health";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function HealthBadge({
  health,
  compact,
}: {
  health: ProjectHealthScore;
  compact?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold ring-1",
              healthToneClass(health.tone)
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", healthDotClass(health.tone))}
            />
            {compact ? health.label : `Health · ${health.label}`}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] space-y-1 text-xs">
          {health.axes.map((ax) => (
            <div key={ax.key} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{ax.label}</span>
              <span className="font-medium">{ax.detail}</span>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function HealthAxesRow({ health }: { health: ProjectHealthScore }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {health.axes
        .filter((a) => a.key !== "blocker")
        .map((ax) => (
          <div
            key={ax.key}
            className="rounded-xl bg-muted/40 px-2.5 py-2 ring-1 ring-border/50"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", healthDotClass(ax.tone))}
              />
              {ax.label}
            </div>
            <div className="mt-1 truncate text-xs font-medium">{ax.detail}</div>
          </div>
        ))}
    </div>
  );
}

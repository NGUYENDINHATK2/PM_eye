import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "indigo",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: "indigo" | "emerald" | "rose" | "amber" | "sky" | "violet";
}) {
  const toneStyles: Record<string, { bg: string; ring: string; glow: string; iconColor: string }> = {
    indigo: {
      bg: "from-indigo-500/20 via-indigo-500/5 to-transparent",
      ring: "ring-indigo-500/20",
      glow: "from-indigo-500/30 to-violet-500/20",
      iconColor: "text-indigo-500",
    },
    emerald: {
      bg: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      ring: "ring-emerald-500/20",
      glow: "from-emerald-500/30 to-teal-500/20",
      iconColor: "text-emerald-500",
    },
    rose: {
      bg: "from-rose-500/20 via-rose-500/5 to-transparent",
      ring: "ring-rose-500/20",
      glow: "from-rose-500/30 to-pink-500/20",
      iconColor: "text-rose-500",
    },
    amber: {
      bg: "from-amber-500/20 via-amber-500/5 to-transparent",
      ring: "ring-amber-500/20",
      glow: "from-amber-500/30 to-orange-500/20",
      iconColor: "text-amber-500",
    },
    sky: {
      bg: "from-sky-500/20 via-sky-500/5 to-transparent",
      ring: "ring-sky-500/20",
      glow: "from-sky-500/30 to-cyan-500/20",
      iconColor: "text-sky-500",
    },
    violet: {
      bg: "from-violet-500/20 via-violet-500/5 to-transparent",
      ring: "ring-violet-500/20",
      glow: "from-violet-500/30 to-purple-500/20",
      iconColor: "text-violet-500",
    },
  };

  const t = toneStyles[tone];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center py-14 px-6 text-center overflow-hidden",
        className
      )}
    >
      {/* Background glow */}
      <div
        className={cn(
          "absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-50 pointer-events-none bg-gradient-to-br",
          t.glow
        )}
      />

      {/* Icon stack with depth */}
      <div className="relative mb-5">
        {/* Background plates */}
        <div
          className={cn(
            "absolute -inset-3 rounded-3xl bg-gradient-to-br opacity-50 blur-md",
            t.bg
          )}
        />
        <div
          className={cn(
            "absolute -inset-1 rounded-2xl bg-gradient-to-br opacity-70",
            t.bg
          )}
        />
        {/* Main icon container */}
        <div
          className={cn(
            "relative w-14 h-14 rounded-2xl flex items-center justify-center bg-card ring-1 shadow-md",
            t.ring
          )}
        >
          <Icon size={22} className={t.iconColor} strokeWidth={2.2} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-5 inline-flex">{action}</div>}
      </div>
    </div>
  );
}

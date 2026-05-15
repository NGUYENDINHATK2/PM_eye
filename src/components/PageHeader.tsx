import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  crumbs,
  actions,
  highlight,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("animate-fade-up mb-8", className)}>
      {crumbs && crumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-[11px] font-mono tracking-wider text-muted-foreground mb-3">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1">
                {c.href && !isLast ? (
                  <Link
                    href={c.href}
                    className="hover:text-neon-cyan transition"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-foreground" : ""}>
                    {c.label}
                  </span>
                )}
                {!isLast && (
                  <ChevronRight
                    size={11}
                    className="text-neon-cyan/40"
                  />
                )}
              </span>
            );
          })}
        </nav>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase mb-2 flex items-center gap-2 text-neon-cyan">
              <span className="status-dot" />
              <span>// {eyebrow}</span>
            </div>
          )}
          <h1
            className={cn(
              "font-display text-3xl sm:text-4xl lg:text-[40px] font-semibold tracking-tight leading-[1.05]",
              highlight && "holo-text"
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
          <div className="neon-divider mt-4 max-w-xl" />
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

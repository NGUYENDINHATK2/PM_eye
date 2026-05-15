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
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1">
                {c.href && !isLast ? (
                  <Link
                    href={c.href}
                    className="hover:text-foreground transition"
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
                    className="text-muted-foreground/50"
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
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-500" />
              {eyebrow}
            </div>
          )}
          <h1
            className={cn(
              "font-display text-3xl sm:text-4xl lg:text-[40px] font-semibold tracking-tight leading-[1.05]",
              highlight && "gradient-text"
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
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

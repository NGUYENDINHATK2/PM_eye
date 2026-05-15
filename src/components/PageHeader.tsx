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
  /** Tô gradient nhẹ vào title (cho hero pages) */
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
            <div className="eyebrow text-[10px] mb-1.5 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-500" />
              {eyebrow}
            </div>
          )}
          <h1
            className={cn(
              "text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-tight",
              highlight && "gradient-text"
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
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

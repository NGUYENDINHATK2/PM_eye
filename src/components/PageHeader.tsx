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
    <div className={cn("animate-fade-up relative mb-8", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-4 -top-6 h-28 w-56 rounded-full bg-teal-500/[0.07] blur-3xl dark:bg-teal-400/[0.08]"
      />

      {crumbs && crumbs.length > 0 && (
        <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1">
                {c.href && !isLast ? (
                  <Link
                    href={c.href}
                    className="transition hover:text-foreground"
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

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
              </span>
              {eyebrow}
            </div>
          )}
          <h1
            className={cn(
              "font-display text-2xl font-semibold leading-[1.1] tracking-tight sm:text-3xl lg:text-[2.15rem]",
              highlight && "gradient-text"
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

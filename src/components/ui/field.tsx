import * as React from "react";
import { cn } from "@/lib/utils";

/** Wrapper field — label + control luôn cùng nhịp khoảng cách */
export function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

/**
 * Hàng label cố định chiều cao — tránh select/input lệch vì badge / link reset.
 */
export function FieldLabelRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-5 min-h-5 items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  );
}

/** Hàng 2 cột — căn đỉnh để mọi input h-11 thẳng hàng */
export function FieldGrid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start",
        className
      )}
      {...props}
    />
  );
}

type FieldControlProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
};

/** Icon trái / suffix phải — luôn giữa theo chiều cao control h-11 */
export function FieldControl({
  className,
  icon,
  suffix,
  children,
  ...props
}: FieldControlProps) {
  return (
    <div className={cn("relative w-full", className)} {...props}>
      {icon ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 z-[1] flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground/65 [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      ) : null}
      {children}
      {suffix ? (
        <span className="pointer-events-none absolute right-3.5 top-1/2 z-[1] flex -translate-y-1/2 items-center text-[11px] font-semibold tracking-wide text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function fieldIconPad(hasIcon?: boolean, hasSuffix?: boolean) {
  return cn(hasIcon && "pl-10", hasSuffix && "pr-14");
}

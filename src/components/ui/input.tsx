import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "box-border flex h-11 w-full min-w-0 items-center rounded-xl",
          "border border-transparent bg-muted/70 px-3.5 text-sm leading-none",
          "text-foreground shadow-none tnum",
          "placeholder:text-muted-foreground/65",
          "transition-[background-color,box-shadow,border-color] duration-200",
          "hover:bg-muted",
          "focus-visible:outline-none focus-visible:border-primary/35",
          "focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-muted/70",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // date/time: browser hay làm lệch chiều cao — ép đồng bộ
          "[&::-webkit-calendar-picker-indicator]:mr-0.5 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          type === "date" || type === "datetime-local" || type === "time"
            ? "appearance-none"
            : null,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

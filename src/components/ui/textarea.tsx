import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-transparent",
        "bg-muted/70 px-3.5 py-3 text-sm text-foreground shadow-none",
        "placeholder:text-muted-foreground/70",
        "transition-[background-color,box-shadow,border-color] duration-200",
        "hover:bg-muted",
        "focus-visible:outline-none focus-visible:border-primary/35",
        "focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-primary/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

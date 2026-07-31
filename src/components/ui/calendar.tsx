"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={vi}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 [--rdp-accent-color:hsl(var(--primary))]", className)}
      classNames={{
        root: "rdp-root",
        months: "relative flex flex-col",
        month: "space-y-3",
        month_caption:
          "relative flex h-10 items-center justify-center px-10",
        caption_label: "text-sm font-semibold tracking-tight capitalize",
        nav: "absolute inset-x-0 top-0 flex h-10 items-center justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "z-10 h-8 w-8 rounded-xl bg-muted/60 hover:bg-muted"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "z-10 h-8 w-8 rounded-xl bg-muted/60 hover:bg-muted"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
        weeks: "flex flex-col gap-0.5 mt-1",
        week: "flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm tnum",
          "transition-colors hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        ),
        selected:
          "[&_button]:bg-teal-500 [&_button]:font-semibold [&_button]:text-white [&_button]:hover:bg-teal-600 [&_button]:hover:text-white",
        today:
          "[&_button]:font-semibold [&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-teal-500/35",
        outside: "[&_button]:text-muted-foreground/35",
        disabled: "[&_button]:text-muted-foreground/25 [&_button]:opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft
              className={cn("h-4 w-4", chevronClass)}
              {...chevronProps}
            />
          ) : (
            <ChevronRight
              className={cn("h-4 w-4", chevronClass)}
              {...chevronProps}
            />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

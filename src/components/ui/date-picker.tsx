"use client";

import * as React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseYmd(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.slice(0, 10));
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export type DatePickerProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Icon lịch bên trái — tắt khi đã bọc FieldControl */
  showIcon?: boolean;
};

export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Chọn ngày",
  disabled,
  required,
  className,
  showIcon = true,
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const [inner, setInner] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);

  const ymd = isControlled ? value ?? "" : inner;
  const selected = parseYmd(ymd);

  function setYmd(next: string) {
    if (!isControlled) setInner(next);
    onChange?.(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      {name ? (
        <input type="hidden" name={name} value={ymd} required={required} />
      ) : null}
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-required={required}
          className={cn(
            "relative box-border flex h-11 w-full min-w-0 items-center rounded-xl",
            "border border-transparent bg-muted/70 px-3.5 text-left text-sm leading-none",
            "shadow-none transition-[background-color,box-shadow,border-color] duration-200",
            "hover:bg-muted",
            "focus-visible:outline-none focus-visible:border-primary/35",
            "focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-primary/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showIcon && "pl-10",
            className
          )}
        >
          {showIcon ? (
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
          ) : null}
          <span
            className={cn(
              "tnum flex-1 truncate",
              selected ? "text-foreground" : "text-muted-foreground/70"
            )}
          >
            {selected
              ? format(selected, "dd/MM/yyyy", { locale: vi })
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) {
              setYmd("");
              return;
            }
            setYmd(formatYmd(d));
            setOpen(false);
          }}
          defaultMonth={selected}
          autoFocus
        />
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5">
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => {
              setYmd("");
              setOpen(false);
            }}
          >
            Xóa
          </button>
          <button
            type="button"
            className="rounded-lg bg-teal-500/10 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-500/15 dark:text-teal-300"
            onClick={() => {
              setYmd(formatYmd(new Date()));
              setOpen(false);
            }}
          >
            Hôm nay
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

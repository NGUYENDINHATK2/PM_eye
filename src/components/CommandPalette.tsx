"use client";

import { useAppData } from "@/lib/hooks/useAppData";
import { cn } from "@/lib/utils";
import {
  Activity,
  Briefcase,
  CalendarRange,
  LayoutDashboard,
  LineChart,
  Receipt,
  Search,
  Sliders,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
  group: string;
};

const NAV: (Item & { roles?: string[] })[] = [
  { id: "nav-dash", label: "Dashboard", href: "/", icon: LayoutDashboard, group: "Điều hướng" },
  { id: "nav-ins", label: "Insights", href: "/insights", icon: LineChart, group: "Điều hướng", roles: ["admin", "manager", "pm"] },
  { id: "nav-cap", label: "Capacity team", href: "/capacity", icon: Activity, group: "Điều hướng" },
  { id: "nav-emp", label: "Nhân sự", href: "/employees", icon: Users, group: "Điều hướng", roles: ["admin", "manager", "pm"] },
  { id: "nav-proj", label: "Dự án", href: "/projects", icon: Briefcase, group: "Điều hướng" },
  { id: "nav-timeline", label: "Tiến độ dự án", href: "/timeline", icon: CalendarRange, group: "Điều hướng" },
  {
    id: "nav-alloc",
    label: "Phân bổ",
    href: "/allocations",
    icon: Sliders,
    group: "Điều hướng",
    roles: ["admin", "manager", "pm"],
  },
  {
    id: "nav-my-plan",
    label: "Kế hoạch của tôi",
    href: "/allocations",
    icon: Sliders,
    group: "Điều hướng",
    roles: ["member"],
  },
  { id: "nav-exp", label: "Chi phí", href: "/expenses", icon: Receipt, group: "Điều hướng", roles: ["admin", "manager", "pm"] },
  { id: "nav-users", label: "Tài khoản", href: "/settings/users", icon: Users, group: "Điều hướng", roles: ["admin"] },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { data } = useAppData();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const role = data?.user.role;
    const nav = NAV.filter((i) => !i.roles || (role && i.roles.includes(role)));
    const people: Item[] = (data?.profiles ?? []).map((p) => ({
      id: `p-${p.id}`,
      label: p.full_name,
      hint: p.job_role,
      href: "/employees",
      icon: Users,
      group: "Nhân sự",
    }));
    const projects: Item[] = (data?.projects ?? []).map((p) => ({
      id: `j-${p.id}`,
      label: p.name,
      hint: p.status,
      href: `/projects/${p.id}`,
      icon: Briefcase,
      group: "Dự án",
    }));
    const all = [
      ...nav,
      ...projects,
      ...(role === "member" ? [] : people),
    ];
    const query = q.trim().toLowerCase();
    if (!query) return all.slice(0, 12);
    return all
      .filter(
        (i) =>
          i.label.toLowerCase().includes(query) ||
          i.hint?.toLowerCase().includes(query) ||
          i.group.toLowerCase().includes(query)
      )
      .slice(0, 16);
  }, [data, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  const go = useCallback(
    (item: Item) => {
      onOpenChange(false);
      router.push(item.href);
    },
    [onOpenChange, router]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" && items[active]) {
        e.preventDefault();
        go(items[active]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active, go, onOpenChange]);

  if (!open) return null;

  const groups = items.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal
        aria-label="Tìm kiếm nhanh"
        className="relative w-full max-w-lg rounded-2xl border bg-card shadow-2xl animate-scale-in overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 h-12 border-b">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm dự án, nhân sự, trang…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Không có kết quả cho “{q}”
            </div>
          ) : (
            Object.entries(groups).map(([group, list]) => (
              <div key={group} className="mb-2">
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {list.map((item) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => go(item)}
                        onMouseEnter={() => setActive(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm text-left transition",
                          idx === active
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted/70"
                        )}
                      >
                        <Icon size={15} className="text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate font-medium">{item.label}</span>
                        {item.hint && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {item.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-2 border-t text-[10px] text-muted-foreground flex items-center gap-3">
          <span>↑↓ di chuyển</span>
          <span>↵ mở</span>
          <span className="ml-auto">⌘K mở lại</span>
        </div>
      </div>
    </div>
  );
}

/** Hook gắn ⌘K / Ctrl+K toàn app. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}

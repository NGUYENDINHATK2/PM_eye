"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Sliders,
  Receipt,
  Eye,
  LogOut,
  Search,
  Settings,
  ChevronsUpDown,
  Activity,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Item = {
  href: string;
  label: string;
  icon: typeof Briefcase;
  badge?: number;
};

const NAV: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/capacity", label: "Capacity team", icon: Activity },
  { href: "/employees", label: "Nhân sự", icon: Users },
  { href: "/projects", label: "Dự án", icon: Briefcase },
  { href: "/allocations", label: "Phân bổ", icon: Sliders },
  { href: "/expenses", label: "Chi phí", icon: Receipt },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close drawer when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar — only visible on small screens */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-2 px-3 h-14 bg-card/85 backdrop-blur-xl border-b">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-accent transition"
          aria-label="Mở menu"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 flex items-center justify-center text-white shadow-md">
            <Eye size={14} strokeWidth={2.5} />
          </div>
          <div className="font-semibold tracking-tight text-sm">
            PM<span className="gradient-text">_Eye</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full focus:outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {userEmail?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
              {userEmail}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-rose-600 focus:text-rose-600"
            >
              <LogOut size={14} />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Spacer to push content below mobile header */}
      <div className="lg:hidden h-14 shrink-0" />

      {/* Mobile backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, fixed on desktop */}
      <aside
        className={cn(
          "z-50 glass border-r flex flex-col",
          // Mobile: slide-in drawer
          "fixed inset-y-0 left-0 w-[280px] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: sticky inline
          "lg:sticky lg:top-0 lg:translate-x-0 lg:w-[260px] lg:h-screen lg:shrink-0"
        )}
      >
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 blur-lg opacity-60 rounded-2xl animate-float" />
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 flex items-center justify-center text-white shadow-lg">
                <Eye size={18} strokeWidth={2.5} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold tracking-tight">
                PM<span className="gradient-text">_Eye</span>
              </div>
              <div className="text-[10px] text-muted-foreground tnum">
                v1.0 · Internal
              </div>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition"
            aria-label="Đóng menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Command search hint */}
        <div className="px-3 pb-3">
          <button
            type="button"
            className="w-full flex items-center gap-2 h-9 px-3 rounded-lg border bg-background/40 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition group"
          >
            <Search size={13} />
            <span className="flex-1 text-left">Tìm kiếm...</span>
            <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 overflow-y-auto no-scrollbar">
          <div className="px-3 py-2">
            <div className="eyebrow text-[10px]">Workspace</div>
          </div>
          <div className="space-y-0.5">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return <NavLink key={item.href} item={item} active={active} />;
            })}
          </div>

          <div className="px-3 pt-6 pb-2">
            <div className="eyebrow text-[10px]">General</div>
          </div>
          <div className="space-y-0.5">
            <NavLink
              item={{ href: "#", label: "Cài đặt", icon: Settings }}
              active={false}
            />
          </div>
        </nav>

        {/* Footer: theme toggle + tip */}
        <div className="hidden lg:block px-3 pb-2 pt-3">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Giao diện
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* User — desktop only (mobile has dropdown in header) */}
        <div className="hidden lg:block px-2 pb-3 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/60 transition focus:outline-none border border-transparent hover:border-border">
              <Avatar className="h-8 w-8 ring-2 ring-indigo-500/20">
                <AvatarFallback>
                  {userEmail?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium truncate">{userEmail}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online · Admin
                </div>
              </div>
              <ChevronsUpDown
                size={13}
                className="text-muted-foreground shrink-0"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                {userEmail}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-rose-600 focus:text-rose-600"
              >
                <LogOut size={14} />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 h-10 mx-1 px-3 rounded-lg text-sm transition-all",
        active
          ? "text-foreground font-medium shadow-[0_1px_0_0_hsl(0_0%_100%/0.06)_inset,0_1px_2px_hsl(0_0%_0%/0.05)] bg-gradient-to-r from-indigo-500/[0.12] via-indigo-500/[0.08] to-transparent border border-indigo-500/20"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-500" />
      )}
      <span
        className={cn(
          "relative flex items-center justify-center w-5 h-5 rounded-md transition-all shrink-0",
          active && "text-indigo-500"
        )}
      >
        <Icon size={15} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="text-[10px] tnum font-semibold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

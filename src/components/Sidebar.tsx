"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { roleLabel } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  Activity,
  Briefcase,
  ChevronRight,
  Eye,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Receipt,
  Search,
  Shield,
  Sliders,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Item = {
  href: string;
  label: string;
  icon: typeof Briefcase;
  roles?: AppRole[]; // undefined = all
};

const MENU_ITEMS: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/insights",
    label: "Insights",
    icon: LineChart,
    roles: ["admin", "manager", "pm"],
  },
  { href: "/capacity", label: "Capacity team", icon: Activity },
  {
    href: "/employees",
    label: "Nhân sự",
    icon: Users,
    roles: ["admin", "manager", "pm"],
  },
  { href: "/projects", label: "Dự án", icon: Briefcase },
  {
    href: "/allocations",
    label: "Phân bổ",
    icon: Sliders,
    roles: ["admin", "manager", "pm"],
  },
  {
    href: "/expenses",
    label: "Chi phí",
    icon: Receipt,
    roles: ["admin", "manager", "pm"],
  },
  {
    href: "/settings/users",
    label: "Tài khoản",
    icon: Shield,
    roles: ["admin"],
  },
];

export function Sidebar({
  userEmail,
  appRole,
  onOpenSearch,
}: {
  userEmail?: string;
  appRole: AppRole;
  onOpenSearch?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const items = useMemo(
    () =>
      MENU_ITEMS.filter(
        (i) => !i.roles || i.roles.includes(appRole)
      ),
    [appRole]
  );

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/login");
    } catch {
      toast.error("Không đăng xuất được. Thử lại.");
      setSigningOut(false);
      router.refresh();
    }
  }

  const userName = userEmail?.split("@")[0] ?? "User";
  const displayName =
    userName.charAt(0).toUpperCase() + userName.slice(1, 16);

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-2 px-3 h-14 glass border-b">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-accent transition"
          aria-label="Mở menu"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <div className="font-display font-semibold tracking-tight text-sm">
            PM<span className="gradient-text">_Eye</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-accent transition"
          aria-label="Tìm kiếm"
        >
          <Search size={16} />
        </button>
      </header>

      <div className="lg:hidden h-14 shrink-0" />

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "z-50 bg-card border-r flex flex-col",
          "fixed inset-y-0 left-0 w-[272px] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:translate-x-0 lg:w-[248px] lg:h-screen lg:shrink-0"
        )}
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoMark />
            <div className="font-display font-bold tracking-tight text-lg leading-none">
              PM<span className="gradient-text">_Eye</span>
              <div className="text-[10px] font-medium tracking-[0.16em] uppercase text-muted-foreground/80 mt-1.5">
                Ops console
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:bg-accent transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full h-9 px-3 rounded-xl border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition flex items-center gap-2"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Tìm nhanh…</span>
            <kbd className="text-[10px] px-1 py-0.5 rounded border">⌘K</kbd>
          </button>
        </div>

        <div className="px-3 pb-4">
          <div className="rounded-xl border bg-muted/40 p-2.5 flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
              <AvatarFallback className="text-sm bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-semibold">
                {displayName?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{displayName}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="status-dot" />
                {roleLabel(appRole)}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto no-scrollbar">
          <SectionLabel>Menu</SectionLabel>
          <div className="space-y-0.5 mb-6">
            {items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return <NavLink key={item.href} item={item} active={active} />;
            })}
          </div>

          <SectionLabel>Tài khoản</SectionLabel>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="group w-full flex items-center gap-3 h-10 px-3 rounded-xl text-sm text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/[0.08] transition-colors text-left disabled:opacity-60"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-md shrink-0">
              <LogOut size={15} strokeWidth={2} />
            </span>
            <span className="flex-1 truncate">
              {signingOut ? "Đang thoát…" : "Đăng xuất"}
            </span>
          </button>
        </nav>

        <div className="px-4 pb-4 pt-3 space-y-3 border-t lg:hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Theme
            </span>
            <ThemeToggle />
          </div>
        </div>
        {userEmail && (
          <div className="hidden lg:block px-4 pb-4 pt-3 border-t text-[11px] text-muted-foreground/70 truncate">
            {userEmail}
          </div>
        )}
      </aside>
    </>
  );
}

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 flex items-center justify-center rounded-xl text-white overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, hsl(var(--teal)), hsl(var(--sky)))",
        boxShadow: "0 6px 16px -4px hsl(var(--teal) / 0.4)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.35), transparent 60%)",
        }}
      />
      <Eye size={size * 0.45} strokeWidth={2.4} className="relative" />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 font-semibold">
      {children}
    </div>
  );
}

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      className={cn(
        "group relative flex items-center gap-3 h-10 px-3 rounded-xl text-sm transition-colors",
        active
          ? "chip-violet font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded-md shrink-0",
          active ? "text-white" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon size={15} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {active && <ChevronRight size={12} className="opacity-80" />}
    </Link>
  );
}

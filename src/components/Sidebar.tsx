"use client";

import { cn } from "@/lib/utils";
import {
  Activity,
  Briefcase,
  ChevronRight,
  Eye,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Sliders,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Item = {
  href: string;
  label: string;
  icon: typeof Briefcase;
};

const MENU_ITEMS: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/capacity", label: "Capacity team", icon: Activity },
  { href: "/employees", label: "Nhân sự", icon: Users },
  { href: "/projects", label: "Dự án", icon: Briefcase },
  { href: "/allocations", label: "Phân bổ", icon: Sliders },
  { href: "/expenses", label: "Chi phí", icon: Receipt },
];

const ACCOUNT_ITEMS: Item[] = [
  { href: "#profile", label: "Profile", icon: UserIcon },
  { href: "#settings", label: "Cài đặt", icon: Settings },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const userName = userEmail?.split("@")[0] ?? "Admin";
  const displayName =
    userName.charAt(0).toUpperCase() + userName.slice(1, 16);

  return (
    <>
      {/* ============ Mobile top bar ============ */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-2 px-3 h-14 glass border-b">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-accent transition"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <div className="font-display font-semibold tracking-tight text-sm">
            PM<span className="gradient-text">_Eye</span>
          </div>
        </div>
        <Avatar className="h-8 w-8 ring-2 ring-primary/15">
          <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold">
            {userName?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </header>

      <div className="lg:hidden h-14 shrink-0" />

      {/* ============ Backdrop ============ */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ============ Sidebar ============ */}
      <aside
        className={cn(
          "z-50 bg-card border-r flex flex-col",
          "fixed inset-y-0 left-0 w-[272px] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:translate-x-0 lg:w-[260px] lg:h-screen lg:shrink-0"
        )}
      >
        {/* Top: logo */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoMark />
            <div className="font-display font-bold tracking-tight text-lg leading-none">
              PM<span className="gradient-text">_Eye</span>
              <div className="text-[10px] font-medium tracking-[0.18em] uppercase text-muted-foreground/80 mt-1.5">
                Project · People · P&amp;L
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

        {/* User card */}
        <div className="px-3 pb-4">
          <div className="rounded-xl border bg-card p-2.5 flex items-center gap-3 shadow-sm">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20 shrink-0">
              <AvatarFallback className="text-sm bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold">
                {displayName?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{displayName}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="status-dot" />
                Admin
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto no-scrollbar">
          <SectionLabel>Menu</SectionLabel>
          <div className="space-y-0.5 mb-6">
            {MENU_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return <NavLink key={item.href} item={item} active={active} />;
            })}
          </div>

          <SectionLabel>Tài khoản</SectionLabel>
          <div className="space-y-0.5">
            {ACCOUNT_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={false} />
            ))}
            <button
              type="button"
              onClick={signOut}
              className="group w-full flex items-center gap-3 h-10 px-3 rounded-xl text-sm text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/[0.08] transition-colors text-left"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-md shrink-0">
                <LogOut size={15} strokeWidth={2} />
              </span>
              <span className="flex-1 truncate">Đăng xuất</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 space-y-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Theme
            </span>
            <ThemeToggle />
          </div>
          {userEmail && (
            <div className="text-[11px] text-muted-foreground/70 truncate">
              {userEmail}
            </div>
          )}
        </div>
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
        background: "linear-gradient(135deg, hsl(var(--indigo)), hsl(var(--violet)))",
        boxShadow: "0 6px 16px -4px hsl(var(--indigo) / 0.45)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.4), transparent 60%)",
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

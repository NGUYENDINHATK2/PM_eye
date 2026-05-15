"use client";

import { cn } from "@/lib/utils";
import {
  Activity,
  Briefcase,
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
  code: string; // mono short code shown in collapsed state
  icon: typeof Briefcase;
};

const MENU_ITEMS: Item[] = [
  { href: "/", label: "Dashboard", code: "DSH", icon: LayoutDashboard },
  { href: "/capacity", label: "Capacity team", code: "CAP", icon: Activity },
  { href: "/employees", label: "Nhân sự", code: "HR", icon: Users },
  { href: "/projects", label: "Dự án", code: "PRJ", icon: Briefcase },
  { href: "/allocations", label: "Phân bổ", code: "ALC", icon: Sliders },
  { href: "/expenses", label: "Chi phí", code: "FIN", icon: Receipt },
];

const ACCOUNT_ITEMS: Item[] = [
  { href: "#profile", label: "Profile", code: "USR", icon: UserIcon },
  { href: "#settings", label: "Cài đặt", code: "CFG", icon: Settings },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const userName = userEmail?.split("@")[0] ?? "Admin";
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1, 16);

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";

  return (
    <>
      {/* ============ Mobile top bar ============ */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-2 px-3 h-14 glass border-b border-neon-cyan/10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-neon-cyan/10 hover:text-neon-cyan transition"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <div className="font-display font-semibold tracking-tight text-sm">
            PM<span className="holo-text">_Eye</span>
          </div>
        </div>
        <Avatar className="h-8 w-8 ring-2 ring-neon-cyan/30">
          <AvatarFallback className="text-xs bg-gradient-to-br from-neon-violet to-neon-cyan text-white font-mono">
            {userName?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Spacer */}
      <div className="lg:hidden h-14 shrink-0" />

      {/* ============ Backdrop ============ */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ============ Sidebar ============ */}
      <aside
        className={cn(
          "z-50 glass flex flex-col border-r border-neon-cyan/10",
          "fixed inset-y-0 left-0 w-[272px] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:translate-x-0 lg:w-[260px] lg:h-screen lg:shrink-0"
        )}
      >
        {/* vertical neon edge */}
        <div
          aria-hidden
          className="absolute right-0 top-12 bottom-12 w-px"
          style={{
            background:
              "linear-gradient(to bottom, transparent, hsl(var(--neon-cyan)/0.5) 30%, hsl(var(--neon-violet)/0.5) 70%, transparent)",
          }}
        />

        {/* Top: logo */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoMark />
            <div className="font-display font-bold tracking-tight text-lg leading-none">
              PM<span className="holo-text">_Eye</span>
              <div className="text-[9px] font-mono tracking-[0.18em] text-neon-cyan/70 mt-1">
                NEURAL · OPS
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:bg-neon-cyan/10 hover:text-neon-cyan transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* User card */}
        <div className="px-3 pb-4">
          <div className="relative rounded-xl border border-neon-cyan/15 bg-card/40 p-2.5 flex items-center gap-3 overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-neon-cyan/15 blur-2xl pointer-events-none"
            />
            <Avatar className="h-10 w-10 ring-2 ring-neon-cyan/30 shrink-0">
              <AvatarFallback className="text-sm bg-gradient-to-br from-neon-violet to-neon-cyan text-white font-mono font-bold">
                {displayName?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 relative">
              <div className="font-semibold text-sm truncate">{displayName}</div>
              <div className="text-[10px] font-mono tracking-wider text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="status-dot" />
                ADMIN · ONLINE
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto no-scrollbar">
          <SectionLabel>// MENU</SectionLabel>
          <div className="space-y-1 mb-6">
            {MENU_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return <NavLink key={item.href} item={item} active={active} />;
            })}
          </div>

          <SectionLabel>// ACCOUNT</SectionLabel>
          <div className="space-y-1">
            {ACCOUNT_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={false} />
            ))}
            <button
              type="button"
              onClick={signOut}
              className="group w-full flex items-center gap-3 h-10 px-3 rounded-xl text-sm text-muted-foreground hover:text-neon-rose hover:bg-neon-rose/[0.08] transition-colors text-left"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-md shrink-0">
                <LogOut size={15} strokeWidth={2} />
              </span>
              <span className="flex-1 truncate">Đăng xuất</span>
              <span className="text-[9px] font-mono opacity-50 group-hover:opacity-100">EXIT</span>
            </button>
          </div>
        </nav>

        {/* Footer: system status */}
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-neon-cyan/10">
          {/* Live clock */}
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="status-dot" />
              <span className="tracking-wider">SYS</span>
            </span>
            <span className="text-neon-cyan tabular-nums tracking-wider">
              {hh}:{mm}<span className="animate-blink">:</span>{ss}
            </span>
          </div>

          {/* CPU-ish bar */}
          <div>
            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              <span>NEURAL LOAD</span>
              <span className="text-neon-lime tabular-nums">42%</span>
            </div>
            <div className="h-1 rounded-full bg-secondary/60 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: "42%",
                  background:
                    "linear-gradient(90deg, hsl(var(--neon-cyan)), hsl(var(--neon-lime)))",
                  boxShadow: "0 0 8px hsl(var(--neon-cyan) / 0.6)",
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              THEME
            </span>
            <ThemeToggle />
          </div>
          {userEmail && (
            <div className="text-[10px] font-mono text-muted-foreground/60 truncate">
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
        background:
          "linear-gradient(135deg, hsl(var(--neon-violet)), hsl(var(--neon-cyan)))",
        boxShadow:
          "0 0 0 1px hsl(var(--neon-cyan) / 0.4), 0 6px 20px -4px hsl(var(--neon-violet) / 0.6), 0 0 20px -2px hsl(var(--neon-cyan) / 0.5)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(0 0% 100% / 0.4), transparent 60%)",
        }}
      />
      <Eye size={size * 0.45} strokeWidth={2.5} className="relative" />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-[9px] font-mono uppercase tracking-[0.22em] text-neon-cyan/60 font-bold">
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
        "group relative flex items-center gap-3 h-10 px-3 rounded-xl text-sm transition-all",
        active
          ? "bg-gradient-to-r from-neon-violet/20 via-neon-cyan/15 to-transparent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-card/40"
      )}
    >
      {/* Active neon rail */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--neon-cyan)), hsl(var(--neon-violet)))",
            boxShadow: "0 0 12px hsl(var(--neon-cyan) / 0.8)",
          }}
        />
      )}
      <span
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded-md shrink-0 transition-colors",
          active
            ? "text-neon-cyan"
            : "text-muted-foreground group-hover:text-neon-cyan"
        )}
      >
        <Icon size={15} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      <span
        className={cn(
          "text-[9px] font-mono tracking-wider transition-opacity",
          active
            ? "text-neon-cyan opacity-90"
            : "text-muted-foreground opacity-0 group-hover:opacity-60"
        )}
      >
        {item.code}
      </span>
    </Link>
  );
}

"use client";

import { CommandPalette, useCommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TopProgressBar } from "@/components/TopProgressBar";
import { useAppData } from "@/lib/hooks/useAppData";
import { roleLabel } from "@/lib/rbac";
import type { AppRole } from "@/types/database";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { ReactNode } from "react";
import { Toaster, toast } from "sonner";

export function AppShell({
  children,
  userEmail,
  appRole,
}: {
  children: ReactNode;
  userEmail?: string;
  appRole: AppRole;
}) {
  const { open, setOpen } = useCommandPalette();
  const { refreshing, refresh, error, data } = useAppData();
  const role = data?.user.role ?? appRole;

  async function onRefresh() {
    await refresh({ force: true });
    toast.success("Đã đồng bộ dữ liệu mới nhất");
  }

  return (
    <div className="flex min-h-screen">
      <TopProgressBar />
      <Sidebar
        userEmail={userEmail}
        appRole={role}
        onOpenSearch={() => setOpen(true)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-30 hidden h-14 items-center gap-3 border-b border-border/60 px-6 glass lg:flex">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 max-w-md flex-1 items-center gap-2.5 rounded-xl border border-transparent bg-muted/55 px-3.5 text-sm text-muted-foreground transition hover:border-primary/25 hover:bg-muted hover:text-foreground"
          >
            <Search size={15} className="shrink-0 opacity-70" />
            <span className="flex-1 text-left">Tìm dự án, nhân sự, trang…</span>
            <kbd className="rounded-md border bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-500/20 xl:inline-flex dark:text-teal-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              {roleLabel(role)}
            </span>
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                Đang đồng bộ
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Làm mới dữ liệu"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent bg-muted/50 transition hover:bg-accent",
                refreshing && "opacity-60"
              )}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <ThemeToggle compact />
          </div>
        </header>

        <main className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden p-4 sm:p-5 lg:p-7">
          {error && !data ? (
            <div className="max-w-md mx-auto mt-20 text-center space-y-4 animate-fade-up">
              <div className="text-rose-500 font-medium">Không tải được dữ liệu</div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                type="button"
                onClick={() => refresh({ force: true })}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl btn-liquid text-sm font-medium"
              >
                <RefreshCw size={14} />
                Thử lại
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 2800 }}
      />
    </div>
  );
}

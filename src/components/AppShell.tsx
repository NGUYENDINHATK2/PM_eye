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
        <header className="hidden lg:flex sticky top-0 z-30 h-14 items-center gap-3 px-6 border-b glass">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 max-w-md h-9 px-3 rounded-xl border bg-background/80 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition flex items-center gap-2"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Tìm dự án, nhân sự, trang…</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/50">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden xl:inline text-[11px] text-muted-foreground px-2 py-1 rounded-lg border bg-card">
              {roleLabel(role)}
            </span>
            {refreshing && (
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
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
                "w-9 h-9 rounded-xl inline-flex items-center justify-center border bg-card hover:bg-accent transition",
                refreshing && "opacity-60"
              )}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <ThemeToggle compact />
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 lg:p-6 w-full max-w-full overflow-x-hidden">
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

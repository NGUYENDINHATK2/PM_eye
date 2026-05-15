"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "system") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", t === "dark");
  }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("pm-eye-theme") as Theme) || "system";
    setTheme(saved);
    applyTheme(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("pm-eye-theme", theme);
    applyTheme(theme);
  }, [theme, mounted]);

  // Listen for system changes when in 'system' mode
  useEffect(() => {
    if (theme !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, [theme]);

  if (!mounted) {
    // SSR placeholder to avoid hydration mismatch
    return <div className={compact ? "h-8 w-8" : "h-8 w-[88px]"} />;
  }

  const opts: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Sáng" },
    { value: "dark", icon: Moon, label: "Tối" },
    { value: "system", icon: Monitor, label: "Hệ thống" },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border bg-card p-0.5 shadow-xs">
      {opts.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            title={label}
            className={cn(
              "inline-flex items-center justify-center w-7 h-7 rounded-md transition",
              active
                ? "bg-accent text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Top loading bar — hiện thanh gradient mảnh ở đỉnh page khi navigate.
 * Hoạt động bằng cách detect pathname thay đổi và trigger animation.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Override anchor clicks to show progress bar
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      // chỉ catch internal nav
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      if (href.startsWith("http") && !href.includes(window.location.host)) return;
      if (anchor.hasAttribute("download")) return;
      // Cmd/Ctrl/Shift click → mở tab mới, đừng show
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      setVisible(true);
      setProgress(15);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // When pathname changes (page loaded) → complete + hide
  useEffect(() => {
    if (!visible) return;
    setProgress(100);
    const t1 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // While visible, auto-tick progress toward 80%
  useEffect(() => {
    if (!visible || progress >= 80) return;
    const t = setTimeout(() => {
      setProgress((p) => Math.min(80, p + Math.random() * 8 + 3));
    }, 180);
    return () => clearTimeout(t);
  }, [visible, progress]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

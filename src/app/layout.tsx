import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PM_Eye — Project · People · P&L",
  description: "Tool quản lý dự án, nhân sự, chi phí vận hành cho PM/leader.",
};

// Inline script to set theme BEFORE hydration → avoid flash of unstyled (FOUC)
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('pm-eye-theme') || 'dark';
    if (t === 'system') {
      var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (d) document.documentElement.classList.add('dark');
    } else if (t === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

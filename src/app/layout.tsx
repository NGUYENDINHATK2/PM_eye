import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PM_Eye — Project · People · P&L",
  description: "Tool quản lý dự án, nhân sự, chi phí vận hành cho PM/leader.",
};

// FOUC-safe theme init — default LIGHT (clean SaaS aesthetic)
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('pm-eye-theme') || 'light';
    if (t === 'system') {
      var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (d) document.documentElement.classList.add('dark');
    } else if (t === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
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

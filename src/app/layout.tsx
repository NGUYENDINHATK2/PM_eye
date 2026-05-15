import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PM_Eye — Project · People · P&L",
  description: "Tool quản lý dự án, nhân sự, chi phí vận hành cho PM/leader.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

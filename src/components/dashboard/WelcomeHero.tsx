"use client";

import { formatCurrency } from "@/lib/utils";
import { Calendar, TrendingDown, TrendingUp, Wallet } from "lucide-react";

const WEEKDAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

function greeting(hour: number) {
  if (hour < 6) return "Khuya rồi";
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function WelcomeHero({
  userName,
  totalRevenue,
  totalProfit,
  avgMargin,
  arOutstanding,
  warningsCount,
}: {
  userName: string;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  arOutstanding: number;
  warningsCount: number;
}) {
  const now = new Date();
  const greet = greeting(now.getHours());
  const weekday = WEEKDAYS[now.getDay()];
  const dateStr = `${weekday}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const headline =
    warningsCount === 0
      ? "Mọi thứ đang ổn định."
      : warningsCount <= 3
      ? `Có ${warningsCount} điểm cần để ý.`
      : `Có ${warningsCount} cảnh báo — nên check ngay.`;

  const profitable = totalProfit > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl card-premium shine animate-fade-up">
      {/* gradient blobs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-500/30 via-sky-500/20 to-violet-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-gradient-to-tr from-violet-500/20 via-pink-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative p-7 lg:p-9">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Calendar size={13} />
          <span className="capitalize">{dateStr}</span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
          {greet}, <span className="gradient-text">{userName}</span> 👋
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-2 max-w-xl">
          {headline} Đây là tổng quan P&L để bạn nói với sếp.
        </p>

        {/* Hero stats inline — sales lead perspective */}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 items-end">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <Wallet size={11} /> Tổng doanh thu
            </div>
            <div className="text-2xl lg:text-3xl font-semibold tracking-tight tnum gradient-text-emerald mt-1">
              {formatCurrency(totalRevenue)}
            </div>
          </div>

          <div className="h-10 w-px bg-border self-end mb-1" />

          <div>
            <div className="eyebrow flex items-center gap-1.5">
              {profitable ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              Lợi nhuận
            </div>
            <div
              className={`text-2xl lg:text-3xl font-semibold tracking-tight tnum mt-1 ${
                profitable ? "gradient-text-emerald" : "gradient-text-rose"
              }`}
            >
              {formatCurrency(totalProfit)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Margin {Math.round(avgMargin * 100)}%
            </div>
          </div>

          {arOutstanding > 0 && (
            <>
              <div className="h-10 w-px bg-border self-end mb-1" />
              <div>
                <div className="eyebrow">Chưa thu</div>
                <div className="text-2xl lg:text-3xl font-semibold tracking-tight tnum gradient-text-amber mt-1">
                  {formatCurrency(arOutstanding)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

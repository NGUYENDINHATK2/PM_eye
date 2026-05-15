"use client";

import { formatCurrency } from "@/lib/utils";
import {
  Calendar,
  CircleAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

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

  const statusOk = warningsCount === 0;
  const headline = statusOk
    ? "Mọi thứ đang vận hành ổn định."
    : warningsCount <= 3
    ? `${warningsCount} điểm cần để ý trong portfolio.`
    : `${warningsCount} cảnh báo đang chờ xử lý.`;

  const profitable = totalProfit > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl card-premium shine animate-fade-up">
      {/* Soft accent blobs */}
      <div
        aria-hidden
        className="absolute -top-32 -right-24 w-[24rem] h-[24rem] rounded-full blur-3xl pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--indigo) / 0.18), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 w-[20rem] h-[20rem] rounded-full blur-3xl pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--violet) / 0.14), transparent 60%)",
        }}
      />

      <div className="relative p-6 lg:p-9">
        {/* Date + status pill */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={13} />
            <span className="capitalize">{dateStr}</span>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-medium ${
              statusOk
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            }`}
          >
            {statusOk ? (
              <Sparkles size={12} />
            ) : (
              <CircleAlert size={12} />
            )}
            {headline}
          </div>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight leading-[1.05] break-words">
          {greet},{" "}
          <span className="gradient-text">{userName}</span>{" "}
          <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm lg:text-[15px] text-muted-foreground mt-3 max-w-xl leading-relaxed">
          Tổng quan doanh thu, lợi nhuận và dòng tiền của portfolio trong tháng.
        </p>

        {/* KPI tiles */}
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiTile
            label="Tổng doanh thu"
            value={formatCurrency(totalRevenue)}
            icon={<Wallet size={14} />}
            tone="indigo"
          />
          <KpiTile
            label={profitable ? "Lợi nhuận" : "Đang lỗ"}
            value={formatCurrency(totalProfit)}
            sub={`Margin ${Math.round(avgMargin * 100)}%`}
            icon={profitable ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            tone={profitable ? "emerald" : "rose"}
          />
          <KpiTile
            label={arOutstanding > 0 ? "Chưa thu" : "Đã thu đủ"}
            value={formatCurrency(arOutstanding)}
            icon={<Wallet size={14} />}
            tone={arOutstanding > 0 ? "amber" : "emerald"}
          />
        </div>
      </div>
    </div>
  );
}

type Tone = "indigo" | "emerald" | "rose" | "amber";

function KpiTile({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone: Tone;
}) {
  const toneMap: Record<Tone, { border: string; bg: string; iconText: string; valueText: string }> = {
    indigo: {
      border: "border-indigo-500/20",
      bg: "bg-indigo-500/5",
      iconText: "text-indigo-600 dark:text-indigo-400",
      valueText: "gradient-text-indigo",
    },
    emerald: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
      iconText: "text-emerald-600 dark:text-emerald-400",
      valueText: "gradient-text-emerald",
    },
    rose: {
      border: "border-rose-500/20",
      bg: "bg-rose-500/5",
      iconText: "text-rose-600 dark:text-rose-400",
      valueText: "gradient-text-rose",
    },
    amber: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      iconText: "text-amber-600 dark:text-amber-400",
      valueText: "gradient-text-amber",
    },
  };
  const t = toneMap[tone];
  return (
    <div className={`relative rounded-xl border ${t.border} ${t.bg} p-3.5 overflow-hidden`}>
      <div className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-medium ${t.iconText} mb-1.5`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-xl sm:text-2xl lg:text-[26px] font-semibold tracking-tight tnum break-words ${t.valueText}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
      )}
    </div>
  );
}

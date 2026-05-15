"use client";

import { formatCurrency } from "@/lib/utils";
import {
  ActivitySquare,
  AlertOctagon,
  Calendar,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

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
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const reference = now ?? new Date();
  const greet = greeting(reference.getHours());
  const weekday = WEEKDAYS[reference.getDay()];
  const dateStr = `${weekday}, ${reference.getDate()}/${reference.getMonth() + 1}/${reference.getFullYear()}`;
  const timeStr = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
    : "--:--:--";

  const statusOk = warningsCount === 0;
  const headline = statusOk
    ? "ALL SYSTEMS NOMINAL · không có cảnh báo."
    : warningsCount <= 3
    ? `${warningsCount} điểm cần để ý — review HUD bên dưới.`
    : `${warningsCount} CẢNH BÁO ACTIVE — yêu cầu xử lý ngay.`;

  const profitable = totalProfit > 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl cyber-card hud-frame shine animate-fade-up scanlines"
      style={{ minHeight: 240 }}
    >
      <span className="hud-corner-bl" aria-hidden />
      <span className="hud-corner-br" aria-hidden />

      {/* Aurora blobs */}
      <div
        aria-hidden
        className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--neon-cyan) / 0.35), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 w-[24rem] h-[24rem] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--neon-fuchsia) / 0.28), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 cyber-grid opacity-40 pointer-events-none"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 100% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      {/* HUD top strip */}
      <div className="relative flex items-center justify-between border-b border-neon-cyan/15 px-6 lg:px-8 py-2.5 font-mono text-[10px] tracking-[0.22em] uppercase">
        <div className="flex items-center gap-3 text-neon-cyan/80">
          <span className="status-dot" />
          <span>LIVE · NEURAL OPS</span>
          <span className="hidden sm:inline text-muted-foreground/70">
            // BRIEFING_001
          </span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar size={11} className="text-neon-cyan/70" />
          <span className="hidden sm:inline">{dateStr}</span>
          <span className="text-neon-cyan tabular-nums">{timeStr}</span>
        </div>
      </div>

      <div className="relative p-6 lg:p-9">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05] break-words">
          {greet},{" "}
          <span className="holo-text">{userName}</span>
          <span className="text-neon-cyan ml-1 animate-blink">_</span>
        </h1>
        <p
          className={`text-xs sm:text-sm font-mono mt-3 max-w-2xl tracking-wider ${
            statusOk ? "text-neon-lime" : "text-neon-amber"
          }`}
        >
          {statusOk ? (
            <ActivitySquare size={13} className="inline mr-2 -mt-0.5" />
          ) : (
            <AlertOctagon size={13} className="inline mr-2 -mt-0.5" />
          )}
          {headline}
        </p>

        {/* KPI HUD tiles */}
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <HudTile
            label="DOANH THU · REVENUE"
            value={formatCurrency(totalRevenue)}
            icon={<Wallet size={14} />}
            color="cyan"
          />
          <HudTile
            label={profitable ? "LỢI NHUẬN · PROFIT" : "THUA LỖ · LOSS"}
            value={formatCurrency(totalProfit)}
            sub={`MARGIN ${Math.round(avgMargin * 100)}%`}
            icon={profitable ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            color={profitable ? "lime" : "rose"}
          />
          <HudTile
            label={arOutstanding > 0 ? "CHƯA THU · A/R" : "AR · CLEAR"}
            value={formatCurrency(arOutstanding)}
            icon={<Wallet size={14} />}
            color={arOutstanding > 0 ? "amber" : "lime"}
          />
        </div>
      </div>
    </div>
  );
}

type HudColor = "cyan" | "lime" | "rose" | "amber" | "violet";

function HudTile({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  color: HudColor;
}) {
  const colorMap: Record<HudColor, { var: string; text: string }> = {
    cyan: { var: "--neon-cyan", text: "gradient-text-indigo" },
    lime: { var: "--neon-lime", text: "gradient-text-emerald" },
    rose: { var: "--neon-rose", text: "gradient-text-rose" },
    amber: { var: "--neon-amber", text: "gradient-text-amber" },
    violet: { var: "--neon-violet", text: "gradient-text-indigo" },
  };
  const c = colorMap[color];
  return (
    <div
      className="relative rounded-xl border bg-card/40 backdrop-blur-md p-3.5 overflow-hidden group"
      style={{ borderColor: `hsl(var(${c.var}) / 0.25)` }}
    >
      <div
        aria-hidden
        className="absolute top-0 left-3 right-3 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, hsl(var(${c.var}) / 0.7), transparent)`,
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition"
        style={{ background: `hsl(var(${c.var}) / 0.35)` }}
      />
      <div className="relative">
        <div
          className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase mb-2"
          style={{ color: `hsl(var(${c.var}) / 0.9)` }}
        >
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div
          className={`font-mono text-xl sm:text-2xl lg:text-[26px] font-semibold tracking-tight tnum break-words ${c.text}`}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[10px] font-mono tracking-wider text-muted-foreground mt-1">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

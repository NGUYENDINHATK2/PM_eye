"use client";

import { formatCurrency } from "@/lib/utils";
import { Briefcase, Users, TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";

type SparkPoint = { x: number; y: number };

type Stat = {
  title: string;
  code: string;
  value: number;
  display: string;
  hint?: string;
  href: string;
  icon: typeof Briefcase;
  neonVar: string;
  textClass: string;
  spark: SparkPoint[];
};

function useAnimatedNumber(target: number, duration = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function AnimatedValue({
  value,
  formatter,
  className,
}: {
  value: number;
  formatter: (n: number) => string;
  className?: string;
}) {
  const v = useAnimatedNumber(value);
  return <span className={className}>{formatter(v)}</span>;
}

function fakeSpark(seed: number, len = 10): SparkPoint[] {
  const arr: SparkPoint[] = [];
  let v = 40 + (seed % 30);
  for (let i = 0; i < len; i++) {
    v += Math.sin(i * 1.3 + seed) * 8 + ((seed * (i + 1)) % 7) - 3;
    arr.push({ x: i, y: Math.max(10, v) });
  }
  return arr;
}

export function StatCards({
  ongoingProjects,
  activePeople,
  burnThisMonth,
  warnings,
  burnSpark,
}: {
  ongoingProjects: number;
  activePeople: number;
  burnThisMonth: number;
  warnings: number;
  burnSpark?: number[];
}) {
  const burnPoints: SparkPoint[] =
    burnSpark && burnSpark.length > 0
      ? burnSpark.map((y, x) => ({ x, y: y || 0.1 }))
      : fakeSpark(2);

  const stats: Stat[] = [
    {
      title: "Dự án đang chạy",
      code: "PRJ.ACTIVE",
      value: ongoingProjects,
      display: ongoingProjects.toString(),
      hint: "ongoing",
      href: "/projects",
      icon: Briefcase,
      neonVar: "--neon-cyan",
      textClass: "gradient-text-indigo",
      spark: fakeSpark(1),
    },
    {
      title: "Đang phân bổ",
      code: "HR.ALLOC",
      value: activePeople,
      display: activePeople.toString(),
      hint: "người",
      href: "/employees",
      icon: Users,
      neonVar: "--neon-violet",
      textClass: "gradient-text-indigo",
      spark: fakeSpark(3),
    },
    {
      title: "Burn tháng này",
      code: "FIN.BURN",
      value: burnThisMonth,
      display: formatCurrency(burnThisMonth),
      hint: "lương + vận hành",
      href: "/expenses",
      icon: TrendingUp,
      neonVar: "--neon-lime",
      textClass: "gradient-text-emerald",
      spark: burnPoints,
    },
    {
      title: "Cảnh báo",
      code: "SYS.ALERT",
      value: warnings,
      display: warnings.toString(),
      hint: warnings > 0 ? "cần xử lý" : "ổn áp",
      href: "/",
      icon: AlertTriangle,
      neonVar: warnings > 0 ? "--neon-rose" : "--neon-cyan",
      textClass: warnings > 0 ? "gradient-text-rose" : "gradient-text-indigo",
      spark: fakeSpark(5),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {stats.map((s, i) => (
        <Link
          key={s.title}
          href={s.href}
          className="group animate-fade-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div
            className="relative cyber-card hud-frame rounded-2xl overflow-hidden h-full scanlines"
            style={{
              ["--card-neon" as string]: `hsl(var(${s.neonVar}))`,
            }}
          >
            <span className="hud-corner-bl" aria-hidden />
            <span className="hud-corner-br" aria-hidden />

            {/* corner glow */}
            <div
              aria-hidden
              className="absolute -top-14 -right-14 w-40 h-40 rounded-full blur-3xl opacity-50 group-hover:opacity-90 transition-opacity duration-500"
              style={{
                background: `hsl(var(${s.neonVar}) / 0.4)`,
              }}
            />
            {/* top neon line */}
            <div
              aria-hidden
              className="absolute top-0 left-4 right-4 h-px opacity-60 group-hover:opacity-100 transition"
              style={{
                background: `linear-gradient(90deg, transparent, hsl(var(${s.neonVar}) / 0.9), transparent)`,
              }}
            />

            <div className="relative p-4 sm:p-5 min-w-0">
              {/* header */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 relative"
                  style={{
                    background: `linear-gradient(135deg, hsl(var(${s.neonVar})), hsl(var(${s.neonVar}) / 0.6))`,
                    boxShadow: `0 0 0 1px hsl(var(${s.neonVar}) / 0.4), 0 6px 18px -4px hsl(var(${s.neonVar}) / 0.5), 0 0 18px -2px hsl(var(${s.neonVar}) / 0.45)`,
                  }}
                >
                  <s.icon size={15} strokeWidth={2.4} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-mono tracking-[0.18em] opacity-80"
                    style={{ color: `hsl(var(${s.neonVar}))` }}
                  >
                    {s.code}
                  </span>
                  <ArrowUpRight
                    size={13}
                    className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </div>
              </div>

              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground truncate">
                {s.title}
              </div>
              <div
                className={`font-mono text-2xl sm:text-3xl lg:text-[34px] font-semibold tracking-tight tnum mt-1.5 truncate ${s.textClass}`}
              >
                {typeof s.value === "number" && s.value > 1000 ? (
                  <AnimatedValue value={s.value} formatter={(n) => formatCurrency(n)} />
                ) : (
                  <AnimatedValue value={s.value} formatter={(n) => Math.round(n).toString()} />
                )}
              </div>
              {s.hint && (
                <div className="text-[10px] font-mono tracking-wider text-muted-foreground/80 mt-1 uppercase">
                  {s.hint}
                </div>
              )}

              {/* sparkline */}
              <div className="h-10 -mx-1 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.spark}>
                    <defs>
                      <linearGradient id={`sp-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={`hsl(var(${s.neonVar}))`} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={`hsl(var(${s.neonVar}))`} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke={`hsl(var(${s.neonVar}))`}
                      strokeWidth={2}
                      fill={`url(#sp-${i})`}
                      isAnimationActive={true}
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

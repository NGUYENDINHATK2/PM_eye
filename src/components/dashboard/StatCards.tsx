"use client";

import { formatCurrency } from "@/lib/utils";
import { Briefcase, Users, TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";

type SparkPoint = { x: number; y: number };

type Stat = {
  title: string;
  value: number;
  display: string;
  hint?: string;
  href: string;
  icon: typeof Briefcase;
  gradientFrom: string;
  gradientTo: string;
  textClass: string;
  sparkColor: string;
  spark: SparkPoint[];
  trend?: string;
};

// Smooth counter animation
function useAnimatedNumber(target: number, duration = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // ease out cubic
      const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function AnimatedValue({ value, formatter, className }: { value: number; formatter: (n: number) => string; className?: string }) {
  const v = useAnimatedNumber(value);
  return <span className={className}>{formatter(v)}</span>;
}

function fakeSpark(seed: number, len = 8): SparkPoint[] {
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
      value: ongoingProjects,
      display: ongoingProjects.toString(),
      hint: "ongoing",
      href: "/projects",
      icon: Briefcase,
      gradientFrom: "hsl(238 84% 65%)",
      gradientTo: "hsl(258 90% 60%)",
      textClass: "gradient-text-indigo",
      sparkColor: "hsl(238 84% 65%)",
      spark: fakeSpark(1),
    },
    {
      title: "Đang phân bổ",
      value: activePeople,
      display: activePeople.toString(),
      hint: "người",
      href: "/employees",
      icon: Users,
      gradientFrom: "hsl(199 89% 55%)",
      gradientTo: "hsl(199 89% 65%)",
      textClass: "gradient-text-indigo",
      sparkColor: "hsl(199 89% 55%)",
      spark: fakeSpark(3),
    },
    {
      title: "Burn tháng này",
      value: burnThisMonth,
      display: formatCurrency(burnThisMonth),
      hint: "lương + vận hành",
      href: "/expenses",
      icon: TrendingUp,
      gradientFrom: "hsl(158 64% 50%)",
      gradientTo: "hsl(173 58% 45%)",
      textClass: "gradient-text-emerald",
      sparkColor: "hsl(158 64% 50%)",
      spark: burnPoints,
    },
    {
      title: "Cảnh báo",
      value: warnings,
      display: warnings.toString(),
      hint: warnings > 0 ? "cần xử lý" : "ổn áp",
      href: "/",
      icon: AlertTriangle,
      gradientFrom: warnings > 0 ? "hsl(351 95% 65%)" : "hsl(220 14% 60%)",
      gradientTo: warnings > 0 ? "hsl(330 81% 60%)" : "hsl(220 14% 70%)",
      textClass: warnings > 0 ? "gradient-text-rose" : "text-foreground",
      sparkColor: warnings > 0 ? "hsl(351 95% 65%)" : "hsl(220 14% 60%)",
      spark: fakeSpark(5),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <Link
          key={s.title}
          href={s.href}
          className="group animate-fade-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="relative card-premium rounded-2xl overflow-hidden h-full shine">
            {/* corner glow */}
            <div
              className="absolute -top-14 -right-14 w-36 h-36 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-500"
              style={{
                background: `linear-gradient(135deg, ${s.gradientFrom}, ${s.gradientTo})`,
              }}
            />

            <div className="relative p-4 sm:p-5 min-w-0">
              {/* header */}
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${s.gradientFrom}, ${s.gradientTo})`,
                    boxShadow: `0 6px 16px -4px ${s.gradientFrom}66`,
                  }}
                >
                  <s.icon size={14} strokeWidth={2.4} />
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </div>

              {/* number — responsive size + truncate */}
              <div className="eyebrow truncate">{s.title}</div>
              <div
                className={`text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight tnum mt-1.5 truncate ${s.textClass}`}
              >
                {typeof s.value === "number" && s.value > 1000 ? (
                  <AnimatedValue value={s.value} formatter={(n) => formatCurrency(n)} />
                ) : (
                  <AnimatedValue value={s.value} formatter={(n) => Math.round(n).toString()} />
                )}
              </div>
              {s.hint && (
                <div className="text-[11px] text-muted-foreground mt-1">{s.hint}</div>
              )}

              {/* sparkline */}
              <div className="h-9 -mx-1 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.spark}>
                    <defs>
                      <linearGradient id={`sp-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.sparkColor} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={s.sparkColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke={s.sparkColor}
                      strokeWidth={1.8}
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

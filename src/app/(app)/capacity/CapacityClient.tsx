"use client";

import { PageHeader } from "@/components/PageHeader";
import { AvailableByRole } from "@/components/capacity/AvailableByRole";
import { BigHeatmap } from "@/components/capacity/BigHeatmap";
import { CapacityByProject } from "@/components/capacity/CapacityByProject";
import { CapacityDistribution } from "@/components/capacity/CapacityDistribution";
import { CapacityForecast } from "@/components/capacity/CapacityForecast";
import { CapacityStats } from "@/components/capacity/CapacityStats";
import { CapacityTrend } from "@/components/capacity/CapacityTrend";
import { WhereTimeGoes } from "@/components/capacity/WhereTimeGoes";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userLoadCurrentMonth } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import type { Allocation, Profile, Project } from "@/types/database";
import {
  Activity,
  BarChart3,
  CalendarRange,
  Gauge,
  Layers,
  PieChart,
  Search,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

type View =
  | "heatmap"
  | "breakdown"
  | "available"
  | "trend"
  | "distribution"
  | "forecast"
  | "projects";
type Range = "6mo" | "12mo" | "EOY" | "year";
type Sort = "default" | "load_desc" | "load_asc" | "name" | "role";

export function CapacityClient({
  profiles,
  allocations,
  projects,
}: {
  profiles: Profile[];
  allocations: Allocation[];
  projects: Project[];
}) {
  const [view, setView] = useState<View>("forecast");
  const [range, setRange] = useState<Range>("EOY");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [onlyActive, setOnlyActive] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("default");

  const today = useMemo(() => new Date(), []);

  const filteredProfiles = useMemo(() => {
    let list = profiles;
    if (onlyActive) list = list.filter((p) => p.is_active);
    if (roleFilter !== "all") list = list.filter((p) => p.role === roleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q)
      );
    }
    if (sort !== "default") {
      list = [...list];
      if (sort === "name") {
        list.sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
      } else if (sort === "role") {
        list.sort(
          (a, b) =>
            a.role.localeCompare(b.role, "vi") ||
            a.full_name.localeCompare(b.full_name, "vi")
        );
      } else {
        list.sort((a, b) => {
          const la = userLoadCurrentMonth(a.id, allocations, today);
          const lb = userLoadCurrentMonth(b.id, allocations, today);
          return sort === "load_desc" ? lb - la : la - lb;
        });
      }
    }
    return list;
  }, [profiles, onlyActive, roleFilter, search, sort, allocations, today]);

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) set.add(p.role);
    return Array.from(set).sort();
  }, [profiles]);

  const dateRange = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    let end: Date;
    if (range === "6mo") {
      end = new Date(today.getFullYear(), today.getMonth() + 6, 0);
    } else if (range === "12mo") {
      end = new Date(today.getFullYear(), today.getMonth() + 12, 0);
    } else if (range === "year") {
      end = new Date(today.getFullYear() + 1, today.getMonth(), 0);
    } else {
      // EOY — but if we're near year-end, extend into next half
      end = new Date(today.getFullYear(), 11, 31);
      const monthsLeft =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsLeft < 3) {
        end = new Date(today.getFullYear() + 1, 5, 30);
      }
    }
    return { start, end };
  }, [range, today]);

  const viewItems: {
    id: View;
    label: string;
    icon: typeof PieChart;
    desc: string;
  }[] = [
    {
      id: "forecast",
      label: "Forecast",
      icon: Gauge,
      desc: "Utilization tổng + bench / quá tải / dự báo tháng tới",
    },
    {
      id: "heatmap",
      label: "Heatmap",
      icon: CalendarRange,
      desc: "Nhiệt độ tải team theo tháng, click cell xem chi tiết dự án",
    },
    {
      id: "trend",
      label: "Trend",
      icon: TrendingUp,
      desc: "Stacked area FTE đang dùng qua thời gian, chia theo dự án",
    },
    {
      id: "distribution",
      label: "Phân bố",
      icon: BarChart3,
      desc: "Bao nhiêu người ở mỗi nhóm tải (bench/healthy/burnout) qua tháng",
    },
    {
      id: "breakdown",
      label: "Theo dự án",
      icon: Layers,
      desc: "Mỗi người dành bao % cho dự án nào, mỗi tháng",
    },
    {
      id: "available",
      label: "Theo role",
      icon: PieChart,
      desc: "Còn bao nhiêu FTE rảnh theo role để chốt deal",
    },
    {
      id: "projects",
      label: "Theo project",
      icon: Activity,
      desc: "Mỗi dự án ngốn FTE bao nhiêu, ai đang đóng góp",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace · Capacity"
        title="Năng lực team"
        subtitle="7 góc nhìn cho cùng 1 bộ data — chuyển nhanh giữa forecast, heatmap, trend, phân bố để tìm thông tin bạn cần."
      />

      <CapacityStats profiles={profiles} allocations={allocations} />

      {/* Toolbar */}
      <div className="space-y-3">
        {/* View tabs (responsive, wraps on mobile) */}
        <div className="inline-flex rounded-xl border bg-card p-1 shadow-sm flex-wrap">
          {viewItems.map((v) => {
            const active = view === v.id;
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 lg:px-4 h-9 rounded-lg text-xs lg:text-sm font-medium transition",
                  active
                    ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên / role…"
              className="h-9 pl-7 pr-2 text-xs w-[180px] bg-card"
            />
          </div>

          {/* Role filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-[150px] text-xs font-medium bg-card shadow-sm">
              <SelectValue placeholder="Tất cả role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Tất cả role
              </SelectItem>
              {allRoles.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="h-9 w-[150px] text-xs font-medium bg-card shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default" className="text-xs">
                Mặc định
              </SelectItem>
              <SelectItem value="load_desc" className="text-xs">
                Tải cao → thấp
              </SelectItem>
              <SelectItem value="load_asc" className="text-xs">
                Tải thấp → cao
              </SelectItem>
              <SelectItem value="name" className="text-xs">
                Tên A → Z
              </SelectItem>
              <SelectItem value="role" className="text-xs">
                Role A → Z
              </SelectItem>
            </SelectContent>
          </Select>

          <label className="inline-flex items-center gap-1.5 text-xs px-3 h-9 rounded-lg border bg-card shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-500"
            />
            Chỉ active
          </label>

          <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
            {(["6mo", "12mo", "EOY", "year"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 h-7 rounded-md text-xs font-medium transition",
                  range === r
                    ? "bg-accent text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "6mo"
                  ? "6 tháng"
                  : r === "12mo"
                  ? "12 tháng"
                  : r === "EOY"
                  ? "Cuối năm"
                  : "1 năm tới"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View description */}
      <div className="text-xs text-muted-foreground -mt-2 flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-indigo-500" />
        {viewItems.find((v) => v.id === view)?.desc}
        <span className="text-muted-foreground/60">
          · {filteredProfiles.length} người
        </span>
      </div>

      {/* Main view */}
      {view === "forecast" && (
        <CapacityForecast
          profiles={filteredProfiles}
          allocations={allocations}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      )}
      {view === "heatmap" && (
        <BigHeatmap
          profiles={filteredProfiles}
          allocations={allocations}
          projects={projects}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      )}
      {view === "trend" && (
        <CapacityTrend
          profiles={filteredProfiles}
          allocations={allocations}
          projects={projects}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      )}
      {view === "distribution" && (
        <CapacityDistribution
          profiles={filteredProfiles}
          allocations={allocations}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      )}
      {view === "breakdown" && (
        <WhereTimeGoes
          profiles={filteredProfiles}
          allocations={allocations}
          projects={projects}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      )}
      {view === "available" && (
        <AvailableByRole
          profiles={filteredProfiles}
          allocations={allocations}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      )}
      {view === "projects" && (
        <CapacityByProject
          profiles={filteredProfiles}
          allocations={allocations}
          projects={projects}
          startDate={dateRange.start}
        />
      )}

      {/* Legend — only for heatmap / breakdown / available */}
      {(view === "heatmap" || view === "breakdown" || view === "available") && (
        <Legend view={view} />
      )}
    </div>
  );
}

function Legend({ view }: { view: View }) {
  const items =
    view === "available"
      ? [
          { label: "Còn ≥2 FTE", swatch: "linear-gradient(135deg, hsl(158 64% 50%), hsl(173 58% 45%))" },
          { label: "Còn 1-2", swatch: "hsl(158 64% 50% / 0.18)" },
          { label: "Còn <1", swatch: "hsl(38 92% 55% / 0.15)" },
          { label: "<0.3 FTE", swatch: "linear-gradient(135deg, hsl(38 92% 55%), hsl(27 87% 55%))" },
          { label: "Over-allocate", swatch: "linear-gradient(135deg, hsl(351 95% 60%), hsl(330 81% 55%))" },
        ]
      : [
          { label: "Bench", swatch: "hsl(var(--muted))" },
          { label: "<50%", swatch: "hsl(199 89% 50% / 0.4)" },
          { label: "Healthy", swatch: "linear-gradient(135deg, hsl(158 64% 50%), hsl(173 58% 45%))" },
          { label: "Quá tải", swatch: "linear-gradient(135deg, hsl(38 92% 55%), hsl(27 87% 55%))" },
          { label: "Burnout", swatch: "linear-gradient(135deg, hsl(351 95% 60%), hsl(330 81% 55%))" },
        ];

  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground pt-2 border-t">
      <span className="text-[10px] uppercase tracking-wider font-medium">
        Thang nhiệt
      </span>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-md"
            style={{ background: i.swatch }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

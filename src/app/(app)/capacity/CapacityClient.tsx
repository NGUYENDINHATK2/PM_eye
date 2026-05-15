"use client";

import { PageHeader } from "@/components/PageHeader";
import { AvailableByRole } from "@/components/capacity/AvailableByRole";
import { BigHeatmap } from "@/components/capacity/BigHeatmap";
import { CapacityStats } from "@/components/capacity/CapacityStats";
import { WhereTimeGoes } from "@/components/capacity/WhereTimeGoes";
import { cn } from "@/lib/utils";
import type { Allocation, Profile, Project } from "@/types/database";
import { CalendarRange, Layers, PieChart } from "lucide-react";
import { useMemo, useState } from "react";

type View = "heatmap" | "breakdown" | "available";
type Range = "6mo" | "12mo" | "EOY" | "year";

export function CapacityClient({
  profiles,
  allocations,
  projects,
}: {
  profiles: Profile[];
  allocations: Allocation[];
  projects: Project[];
}) {
  const [view, setView] = useState<View>("heatmap");
  const [range, setRange] = useState<Range>("EOY");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [onlyActive, setOnlyActive] = useState(true);

  const filteredProfiles = useMemo(() => {
    let list = profiles;
    if (onlyActive) list = list.filter((p) => p.is_active);
    if (roleFilter !== "all") list = list.filter((p) => p.role === roleFilter);
    return list;
  }, [profiles, onlyActive, roleFilter]);

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) set.add(p.role);
    return Array.from(set).sort();
  }, [profiles]);

  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    let end: Date;
    if (range === "6mo") {
      end = new Date(today.getFullYear(), today.getMonth() + 6, 0);
    } else if (range === "12mo") {
      end = new Date(today.getFullYear(), today.getMonth() + 12, 0);
    } else if (range === "year") {
      end = new Date(today.getFullYear() + 1, today.getMonth(), 0);
    } else {
      // EOY
      end = new Date(today.getFullYear(), 11, 31);
      const monthsLeft =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsLeft < 3) {
        end = new Date(today.getFullYear() + 1, 5, 30);
      }
    }
    return { start, end };
  }, [range]);

  const viewItems: { id: View; label: string; icon: typeof PieChart; desc: string }[] = [
    {
      id: "heatmap",
      label: "Heatmap",
      icon: CalendarRange,
      desc: "Nhiệt độ tải team theo tháng",
    },
    {
      id: "breakdown",
      label: "Chia theo dự án",
      icon: Layers,
      desc: "Mỗi người dành bao % cho dự án nào",
    },
    {
      id: "available",
      label: "Capacity theo role",
      icon: PieChart,
      desc: "Còn bao nhiêu FTE rảnh để nhận deal",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacity team"
        subtitle="Năng lực team theo thời gian — biết ai burn, ai rảnh, role nào sắp full để báo sếp."
      />

      <CapacityStats profiles={profiles} allocations={allocations} />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* View tabs (large) */}
        <div className="inline-flex rounded-xl border bg-card p-1 shadow-sm">
          {viewItems.map((v) => {
            const active = view === v.id;
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium transition",
                  active
                    ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={14} />
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Right side: range + filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-lg border bg-card px-3 text-xs font-medium shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Tất cả role</option>
            {allRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-1.5 text-xs px-3 h-9 rounded-lg border bg-card shadow-sm cursor-pointer">
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
      <div className="text-xs text-muted-foreground -mt-2">
        {viewItems.find((v) => v.id === view)?.desc}
      </div>

      {/* Main view */}
      {view === "heatmap" && (
        <BigHeatmap
          profiles={filteredProfiles}
          allocations={allocations}
          projects={projects}
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

      {/* Legend */}
      <Legend view={view} />
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

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPayment,
} from "@/types/database";
import {
  Activity,
  CheckCircle2,
  Receipt,
  Sliders,
  UserPlus,
} from "lucide-react";

type ActivityItem = {
  id: string;
  type: "allocation" | "expense" | "payment" | "profile";
  date: Date;
  title: string;
  subtitle?: string;
  meta?: string;
  color: string;
  icon: React.ReactNode;
};

export function RecentActivity({
  allocations,
  expenses,
  payments,
  profiles,
  projects,
}: {
  allocations: Allocation[];
  expenses: OperatingExpense[];
  payments: ProjectPayment[];
  profiles: Profile[];
  projects: Project[];
}) {
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const items: ActivityItem[] = [];

  // Recent allocations
  for (const a of allocations.slice(0, 30)) {
    const profile = profilesById.get(a.user_id);
    const project = projectsById.get(a.project_id);
    if (!profile || !project) continue;
    items.push({
      id: `alloc-${a.id}`,
      type: "allocation",
      date: new Date(a.created_at),
      title: `${profile.full_name} → ${project.name}`,
      subtitle: `${Math.round(Number(a.percent) * 100)}% · ${formatDate(a.start_date)} → ${formatDate(a.end_date)}`,
      color: project.color,
      icon: <Sliders size={12} />,
    });
  }

  // Recent expenses
  for (const e of expenses.slice(0, 20)) {
    const project = e.project_id ? projectsById.get(e.project_id) : null;
    items.push({
      id: `exp-${e.id}`,
      type: "expense",
      date: new Date(e.created_at),
      title: e.description ?? "Chi phí không tên",
      subtitle: project ? `${project.name}` : "Chi phí chung",
      meta: formatCurrency(e.amount),
      color: project?.color ?? "hsl(199 89% 50%)",
      icon: <Receipt size={12} />,
    });
  }

  // Recent payments
  for (const p of payments.slice(0, 20)) {
    const project = projectsById.get(p.project_id);
    if (!project) continue;
    const isPaid = p.status === "paid";
    items.push({
      id: `pay-${p.id}`,
      type: "payment",
      date: new Date(p.created_at),
      title: `${isPaid ? "Đã thu" : p.status === "invoiced" ? "Xuất HĐ" : "Đặt cọc"} · ${project.name}`,
      subtitle: p.milestone_name ?? "",
      meta: formatCurrency(p.amount),
      color: isPaid ? "hsl(158 64% 50%)" : "hsl(38 92% 55%)",
      icon: isPaid ? <CheckCircle2 size={12} /> : <Receipt size={12} />,
    });
  }

  // Recent profile additions
  for (const p of profiles.slice(0, 10)) {
    items.push({
      id: `prof-${p.id}`,
      type: "profile",
      date: new Date(p.created_at),
      title: `${p.full_name} tham gia team`,
      subtitle: p.role,
      color: "hsl(238 84% 65%)",
      icon: <UserPlus size={12} />,
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  const top = items.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity size={15} className="text-indigo-500" />
          Hoạt động gần đây
        </CardTitle>
        <CardDescription>
          8 thay đổi mới nhất trên toàn hệ thống
        </CardDescription>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Chưa có hoạt động.
          </div>
        ) : (
          <div className="space-y-0.5">
            {top.map((it, idx) => (
              <div
                key={it.id}
                className="group flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-accent/40 transition"
              >
                {/* Timeline dot + line */}
                <div className="relative shrink-0 w-7 flex justify-center pt-0.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-sm relative z-10"
                    style={{
                      background: `linear-gradient(135deg, ${it.color}, ${it.color}cc)`,
                      boxShadow: `0 2px 8px -2px ${it.color}66`,
                    }}
                  >
                    {it.icon}
                  </div>
                  {idx < top.length - 1 && (
                    <span
                      className="absolute top-7 bottom-0 w-px bg-border -bottom-2"
                      style={{ height: "calc(100% + 4px)" }}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-medium leading-tight truncate">
                      {it.title}
                    </div>
                    {it.meta && (
                      <span className="text-xs font-semibold tnum text-muted-foreground shrink-0">
                        {it.meta}
                      </span>
                    )}
                  </div>
                  {it.subtitle && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {it.subtitle}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {timeAgo(it.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function timeAgo(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return formatDate(d);
}

// silence cn unused
void cn;
void Badge;

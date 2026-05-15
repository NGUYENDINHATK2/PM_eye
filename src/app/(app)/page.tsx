import { AlertList, type Alert } from "@/components/dashboard/AlertList";
import { CashFlowTrend } from "@/components/dashboard/CashFlowTrend";
import { PortfolioMix } from "@/components/dashboard/PortfolioMix";
import { ProjectHealth } from "@/components/dashboard/ProjectHealth";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatCards } from "@/components/dashboard/StatCards";
import { TeamHeatmap } from "@/components/dashboard/TeamHeatmap";
import { TopProjects } from "@/components/dashboard/TopProjects";
import { WelcomeHero } from "@/components/dashboard/WelcomeHero";
import {
  monthlyCostTimeline,
  paymentSummary,
  phaseRoleGaps,
  projectFinance,
  userLoadToday,
} from "@/lib/calculations";
import { fetchAll } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    profiles,
    projects,
    phases,
    allocations,
    expenses,
    payments,
    salaryHistory,
  } = await fetchAll();
  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  const ongoingProjects = projects.filter((p) => p.status === "ongoing").length;
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;

  const activeUserIds = new Set(
    allocations
      .filter((a) => {
        const s = new Date(a.start_date);
        const e = new Date(a.end_date);
        return s <= today && today <= e;
      })
      .map((a) => a.user_id)
  );

  const timeline = monthlyCostTimeline(
    allocations,
    profilesById,
    expenses,
    6,
    undefined,
    salaryHistory
  );
  const burnThisMonth =
    timeline.find((b) => b.key === `${y}-${String(m).padStart(2, "0")}`)?.total ?? 0;

  const finances = projects.map((p) => ({
    project: p,
    finance: projectFinance(
      p,
      allocations,
      profilesById,
      expenses,
      today,
      salaryHistory
    ),
  }));

  // Revenue & profit aggregate
  const totalRevenue = finances.reduce(
    (s, f) => s + f.finance.revenue,
    0
  );
  const totalProfit = finances.reduce(
    (s, f) => (f.finance.hasRevenue ? s + f.finance.profit : s),
    0
  );
  const avgMargin =
    totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  // AR
  const ar = paymentSummary(payments, today);

  // Alerts
  const alerts: Alert[] = [];

  // Margin alerts (loss)
  for (const { project, finance } of finances) {
    if (finance.hasRevenue && finance.profit < 0) {
      alerts.push({
        id: `loss-${project.id}`,
        kind: "budget",
        title: `${project.name} đang LỖ`,
        detail: `Margin ${Math.round(finance.margin * 100)}%, chi vượt doanh thu ${Math.round(
          Math.abs(finance.profit) / 1_000_000
        )}tr.`,
      });
    }
  }

  // Overdue payments alert
  if (ar.overdueCount > 0) {
    alerts.push({
      id: `ar-overdue`,
      kind: "budget",
      title: `${ar.overdueCount} đợt thu quá hạn`,
      detail: `Tổng ${Math.round(
        ar.totalOverdue / 1_000_000
      )}tr — cần chase khách.`,
    });
  }

  for (const p of profiles) {
    const load = userLoadToday(p.id, allocations, today);
    if (load > 1.0) {
      alerts.push({
        id: `burn-${p.id}`,
        kind: "burnout",
        title: `${p.full_name} đang ${Math.round(load * 100)}% tải`,
        detail: `Quá tải so với 100%. Cân nhắc giảm scope hoặc rebalance team.`,
      });
    } else if (load === 0 && p.is_active) {
      alerts.push({
        id: `idle-${p.id}`,
        kind: "idle",
        title: `${p.full_name} đang bench`,
        detail: `Chưa được phân bổ tháng này — có thể đẩy vào dự án mới hoặc cho học/upskill.`,
      });
    }
  }
  for (const { project, finance } of finances) {
    if (!finance.hasCap) continue; // dự án vận hành không có cap
    if (finance.overBudget) {
      alerts.push({
        id: `bud-${project.id}`,
        kind: "budget",
        title: `${project.name} vượt budget`,
        detail: `Đã tiêu ${Math.round(finance.utilization * 100)}% / 100% ngân sách.`,
      });
    } else if (finance.utilization > 0.85 && project.status === "ongoing") {
      alerts.push({
        id: `bud-${project.id}`,
        kind: "budget",
        title: `${project.name} sắp hết budget`,
        detail: `Còn ${Math.max(0, 100 - Math.round(finance.utilization * 100))}% ngân sách.`,
      });
    }
  }
  for (const ph of phases) {
    const startD = new Date(ph.start_date);
    const endD = new Date(ph.end_date);
    if (today < startD || today > endD) continue;
    const gaps = phaseRoleGaps(ph, allocations, profilesById);
    for (const g of gaps) {
      if (g.missing > 0) {
        const proj = projects.find((p) => p.id === ph.project_id);
        alerts.push({
          id: `gap-${ph.id}-${g.role}`,
          kind: "missing-role",
          title: `${proj?.name ?? "?"} · ${ph.phase_name} thiếu ${g.role}`,
          detail: `Cần ${g.required}, đã có ${g.assigned.toFixed(1)} (FTE). Thiếu ~${g.missing.toFixed(1)}.`,
        });
      }
    }
  }

  // user display name
  const emailName = user?.email?.split("@")[0] ?? "bạn";
  const displayName = emailName.length > 12 ? emailName.slice(0, 12) : emailName;

  return (
    <div className="space-y-6">
      <WelcomeHero
        userName={displayName}
        totalRevenue={totalRevenue}
        totalProfit={totalProfit}
        avgMargin={avgMargin}
        arOutstanding={ar.totalInvoiced + ar.totalPlanned}
        warningsCount={alerts.length}
      />

      <StatCards
        ongoingProjects={ongoingProjects}
        activePeople={activeUserIds.size}
        burnThisMonth={burnThisMonth}
        warnings={alerts.length}
        burnSpark={timeline.map((t) => t.total)}
      />

      {/* Cash flow trend — hero data viz */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <div className="lg:col-span-2">
          <CashFlowTrend
            allocations={allocations}
            profilesById={profilesById}
            expenses={expenses}
            payments={payments}
            salaryHistory={salaryHistory}
          />
        </div>
        <AlertList alerts={alerts} />
      </div>

      {/* Top projects leaderboard + Portfolio mix */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <TopProjects items={finances} />
        <PortfolioMix items={finances} />
      </div>

      {/* Team capacity + Project health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 animate-fade-up"
          style={{ animationDelay: "280ms" }}
        >
          <TeamHeatmap profiles={profiles} allocations={allocations} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "340ms" }}>
          <ProjectHealth items={finances} />
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="animate-fade-up" style={{ animationDelay: "400ms" }}>
        <RecentActivity
          allocations={allocations}
          expenses={expenses}
          payments={payments}
          profiles={profiles}
          projects={projects}
        />
      </div>
    </div>
  );
}

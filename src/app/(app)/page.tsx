"use client";

import { AlertList } from "@/components/dashboard/AlertList";
import { CashFlowTrend } from "@/components/dashboard/CashFlowTrend";
import { PortfolioMix } from "@/components/dashboard/PortfolioMix";
import { ProjectHealth } from "@/components/dashboard/ProjectHealth";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatCards } from "@/components/dashboard/StatCards";
import { TeamHeatmap } from "@/components/dashboard/TeamHeatmap";
import { TopProjects } from "@/components/dashboard/TopProjects";
import { WelcomeHero } from "@/components/dashboard/WelcomeHero";
import { PageSkeleton } from "@/components/ui/skeleton";
import { buildAppAlerts } from "@/lib/alerts";
import { monthlyCostTimeline, paymentSummary } from "@/lib/calculations";
import { useAppData } from "@/lib/hooks/useAppData";
import { useMemo } from "react";

export default function DashboardPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="dashboard" />;
  if (!data) return null;

  return <DashboardView data={data} />;
}

function DashboardView({
  data,
}: {
  data: NonNullable<ReturnType<typeof useAppData>["data"]>;
}) {
  const {
    user,
    profiles,
    projects,
    phases,
    allocations,
    expenses,
    payments,
    salaryHistory,
  } = data;

  const computed = useMemo(() => {
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
      timeline.find((b) => b.key === `${y}-${String(m).padStart(2, "0")}`)
        ?.total ?? 0;

    const { alerts, finances } = buildAppAlerts({
      profiles,
      projects,
      phases,
      allocations,
      expenses,
      payments,
      salaryHistory,
      asOf: today,
    });

    const totalRevenue = finances.reduce((s, f) => s + f.finance.revenue, 0);
    const totalProfit = finances.reduce(
      (s, f) => (f.finance.hasRevenue ? s + f.finance.profit : s),
      0
    );
    const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
    const ar = paymentSummary(payments, today);

    const emailName = user?.email?.split("@")[0] ?? "bạn";
    const displayName =
      emailName.length > 12 ? emailName.slice(0, 12) : emailName;

    return {
      profilesById,
      ongoingProjects,
      activeUserIds,
      timeline,
      burnThisMonth,
      finances,
      totalRevenue,
      totalProfit,
      avgMargin,
      ar,
      alerts,
      displayName,
    };
  }, [
    user,
    profiles,
    projects,
    phases,
    allocations,
    expenses,
    payments,
    salaryHistory,
  ]);

  return (
    <div className="space-y-5">
      <section className="space-y-4 animate-fade-up">
        <WelcomeHero
          userName={computed.displayName}
          totalRevenue={computed.totalRevenue}
          totalProfit={computed.totalProfit}
          avgMargin={computed.avgMargin}
          arOutstanding={computed.ar.totalInvoiced + computed.ar.totalPlanned}
          warningsCount={computed.alerts.length}
        />

        <StatCards
          ongoingProjects={computed.ongoingProjects}
          activePeople={computed.activeUserIds.size}
          burnThisMonth={computed.burnThisMonth}
          warnings={computed.alerts.length}
          burnSpark={computed.timeline.map((t) => t.total)}
        />
      </section>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <div className="lg:col-span-2">
          <CashFlowTrend
            allocations={allocations}
            profilesById={computed.profilesById}
            expenses={expenses}
            payments={payments}
            salaryHistory={salaryHistory}
          />
        </div>
        <AlertList alerts={computed.alerts} />
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <TopProjects items={computed.finances} />
        <PortfolioMix items={computed.finances} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 animate-fade-up"
          style={{ animationDelay: "280ms" }}
        >
          <TeamHeatmap profiles={profiles} allocations={allocations} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "340ms" }}>
          <ProjectHealth items={computed.finances} />
        </div>
      </div>

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

"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { InsightsClient } from "./InsightsClient";

export default function InsightsPage() {
  const { data, loading } = useAppData();
  if (loading && !data) return <PageSkeleton variant="dashboard" />;
  if (!data) return null;
  if (!data.user.canViewMoney) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Insights chỉ dành cho admin / quản lý / PM.
      </div>
    );
  }
  return <InsightsClient data={data} />;
}

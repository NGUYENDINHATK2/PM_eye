"use client";

import { NoAccess } from "@/components/NoAccess";
import { PageSkeleton } from "@/components/ui/skeleton";
import { canAccessInsights } from "@/lib/rbac";
import { useAppData } from "@/lib/hooks/useAppData";
import { InsightsClient } from "./InsightsClient";

export default function InsightsPage() {
  const { data, loading } = useAppData();
  if (loading && !data) return <PageSkeleton variant="dashboard" />;
  if (!data) return null;
  if (!canAccessInsights(data.user.role)) {
    return (
      <NoAccess message="Insights chỉ dành cho admin / quản lý / PM." />
    );
  }
  return <InsightsClient data={data} />;
}

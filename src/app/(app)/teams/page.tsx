"use client";

import { NoAccess } from "@/components/NoAccess";
import { PageSkeleton } from "@/components/ui/skeleton";
import { canAccessTeams } from "@/lib/rbac";
import { useAppData } from "@/lib/hooks/useAppData";
import { TeamsClient } from "./TeamsClient";

export default function TeamsPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="table" />;
  if (!data) return null;
  if (!canAccessTeams(data.user.role)) {
    return (
      <NoAccess message="Trang Teams dành cho admin / quản lý / PM." />
    );
  }

  return (
    <TeamsClient
      initialTeams={data.teams ?? []}
      initialMembers={data.teamMembers ?? []}
      profiles={data.profiles}
    />
  );
}

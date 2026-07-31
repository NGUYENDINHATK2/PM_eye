"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { AllocationsClient } from "./AllocationsClient";

export default function AllocationsPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="detail" />;
  if (!data) return null;

  return (
    <AllocationsClient
      profiles={data.profiles}
      projects={data.projects}
      phases={data.phases}
      initialAllocations={data.allocations}
    />
  );
}

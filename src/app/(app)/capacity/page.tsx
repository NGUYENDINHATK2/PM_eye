"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { CapacityClient } from "./CapacityClient";

export default function CapacityPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="dashboard" />;
  if (!data) return null;

  return (
    <CapacityClient
      profiles={data.profiles}
      allocations={data.allocations}
      projects={data.projects}
    />
  );
}

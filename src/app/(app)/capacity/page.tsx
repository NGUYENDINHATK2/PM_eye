"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { CapacityClient } from "./CapacityClient";

export default function CapacityPage() {
  const { data, loading, error } = useAppData();

  if (loading) return <PageSkeleton variant="dashboard" />;
  if (error)
    return (
      <div className="text-center py-20 text-rose-500">
        Lỗi tải dữ liệu: {error}
      </div>
    );
  if (!data) return null;

  return (
    <CapacityClient
      profiles={data.profiles}
      allocations={data.allocations}
      projects={data.projects}
    />
  );
}

"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { AllocationsClient } from "./AllocationsClient";

export default function AllocationsPage() {
  const { data, loading, error } = useAppData();

  if (loading) return <PageSkeleton variant="detail" />;
  if (error)
    return (
      <div className="text-center py-20 text-rose-500">
        Lỗi tải dữ liệu: {error}
      </div>
    );
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

"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { ProjectsClient } from "./ProjectsClient";

export default function ProjectsPage() {
  const { data, loading, error } = useAppData();

  if (loading) return <PageSkeleton variant="list" />;
  if (error)
    return (
      <div className="text-center py-20 text-rose-500">
        Lỗi tải dữ liệu: {error}
      </div>
    );
  if (!data) return null;

  return (
    <ProjectsClient
      initialProjects={data.projects}
      phases={data.phases}
      allocations={data.allocations}
      expenses={data.expenses}
      profiles={data.profiles}
      salaryHistory={data.salaryHistory}
    />
  );
}

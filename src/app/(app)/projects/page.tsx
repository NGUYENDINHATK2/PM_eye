"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { ProjectsClient } from "./ProjectsClient";

export default function ProjectsPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="list" />;
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

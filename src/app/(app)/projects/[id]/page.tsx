"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { useParams, notFound } from "next/navigation";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="detail" />;
  if (!data) return null;

  const project = data.projects.find((p) => p.id === id);
  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailClient
      project={project}
      profiles={data.profiles}
      phases={data.phases.filter((ph) => ph.project_id === id)}
      allocations={data.allocations.filter((a) => a.project_id === id)}
      allAllocations={data.allocations}
      expenses={data.expenses.filter((e) => e.project_id === id)}
      initialPayments={data.payments.filter((p) => p.project_id === id)}
      salaryHistory={data.salaryHistory}
    />
  );
}

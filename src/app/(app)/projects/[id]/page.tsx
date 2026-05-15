"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, loading, error } = useAppData();

  if (loading) return <PageSkeleton variant="detail" />;
  if (error)
    return (
      <div className="text-center py-20 text-rose-500">
        Lỗi tải dữ liệu: {error}
      </div>
    );
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

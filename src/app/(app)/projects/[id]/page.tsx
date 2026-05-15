import { fetchAll } from "@/lib/data";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const {
    profiles,
    projects,
    phases,
    allocations,
    expenses,
    payments,
    salaryHistory,
  } = await fetchAll();
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();
  return (
    <ProjectDetailClient
      project={project}
      profiles={profiles}
      phases={phases.filter((ph) => ph.project_id === id)}
      allocations={allocations.filter((a) => a.project_id === id)}
      allAllocations={allocations}
      expenses={expenses.filter((e) => e.project_id === id)}
      initialPayments={payments.filter((p) => p.project_id === id)}
      salaryHistory={salaryHistory}
    />
  );
}

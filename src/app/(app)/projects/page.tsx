import { ProjectsClient } from "./ProjectsClient";
import { fetchAll } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { projects, phases, allocations, expenses, profiles, salaryHistory } =
    await fetchAll();
  return (
    <ProjectsClient
      initialProjects={projects}
      phases={phases}
      allocations={allocations}
      expenses={expenses}
      profiles={profiles}
      salaryHistory={salaryHistory}
    />
  );
}

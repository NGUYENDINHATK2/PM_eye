import { fetchAll } from "@/lib/data";
import { AllocationsClient } from "./AllocationsClient";

export const dynamic = "force-dynamic";

export default async function AllocationsPage() {
  const { profiles, projects, phases, allocations } = await fetchAll();
  return (
    <AllocationsClient
      profiles={profiles}
      projects={projects}
      phases={phases}
      initialAllocations={allocations}
    />
  );
}

import { fetchAll } from "@/lib/data";
import { CapacityClient } from "./CapacityClient";

export const dynamic = "force-dynamic";

export default async function CapacityPage() {
  const { profiles, allocations, projects } = await fetchAll();
  return (
    <CapacityClient
      profiles={profiles}
      allocations={allocations}
      projects={projects}
    />
  );
}

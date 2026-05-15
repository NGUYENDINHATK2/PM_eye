import { EmployeesClient } from "./EmployeesClient";
import { fetchAll } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const { profiles, allocations } = await fetchAll();
  return <EmployeesClient initialProfiles={profiles} initialAllocations={allocations} />;
}

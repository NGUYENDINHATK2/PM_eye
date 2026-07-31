"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { EmployeesClient } from "./EmployeesClient";

export default function EmployeesPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="table" />;
  if (!data) return null;

  return (
    <EmployeesClient
      initialProfiles={data.profiles}
      initialAllocations={data.allocations}
      initialSalaryHistory={data.salaryHistory}
    />
  );
}

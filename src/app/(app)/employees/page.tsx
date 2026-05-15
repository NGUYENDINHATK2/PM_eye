"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { EmployeesClient } from "./EmployeesClient";

export default function EmployeesPage() {
  const { data, loading, error } = useAppData();

  if (loading) return <PageSkeleton variant="table" />;
  if (error)
    return (
      <div className="text-center py-20 text-rose-500">
        Lỗi tải dữ liệu: {error}
      </div>
    );
  if (!data) return null;

  return (
    <EmployeesClient
      initialProfiles={data.profiles}
      initialAllocations={data.allocations}
      initialSalaryHistory={data.salaryHistory}
    />
  );
}

"use client";

import { NoAccess } from "@/components/NoAccess";
import { PageSkeleton } from "@/components/ui/skeleton";
import { canAccessEmployees } from "@/lib/rbac";
import { useAppData } from "@/lib/hooks/useAppData";
import { EmployeesClient } from "./EmployeesClient";

export default function EmployeesPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="table" />;
  if (!data) return null;
  if (!canAccessEmployees(data.user.role)) {
    return (
      <NoAccess message="Trang Nhân sự dành cho admin / quản lý / PM." />
    );
  }

  return (
    <EmployeesClient
      initialProfiles={data.profiles}
      initialAllocations={data.allocations}
      initialSalaryHistory={data.salaryHistory}
    />
  );
}

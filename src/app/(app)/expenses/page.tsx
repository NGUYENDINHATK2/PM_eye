"use client";

import { NoAccess } from "@/components/NoAccess";
import { PageSkeleton } from "@/components/ui/skeleton";
import { canAccessExpenses } from "@/lib/rbac";
import { useAppData } from "@/lib/hooks/useAppData";
import { ExpensesClient } from "./ExpensesClient";

export default function ExpensesPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="table" />;
  if (!data) return null;
  if (!canAccessExpenses(data.user.role)) {
    return (
      <NoAccess message="Chi phí chỉ dành cho admin / quản lý / PM." />
    );
  }

  return (
    <ExpensesClient
      projects={data.projects}
      initialExpenses={data.expenses}
    />
  );
}

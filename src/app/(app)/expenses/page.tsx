"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { ExpensesClient } from "./ExpensesClient";

export default function ExpensesPage() {
  const { data, loading } = useAppData();

  if (loading && !data) return <PageSkeleton variant="table" />;
  if (!data) return null;

  return (
    <ExpensesClient
      projects={data.projects}
      initialExpenses={data.expenses}
    />
  );
}

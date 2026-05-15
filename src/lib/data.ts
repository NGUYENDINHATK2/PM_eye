import { createClient } from "@/lib/supabase/server";
import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPayment,
  ProjectPhase,
  SalaryHistory,
} from "@/types/database";

export async function fetchAll() {
  const supabase = await createClient();
  const [
    profiles,
    projects,
    phases,
    allocations,
    expenses,
    payments,
    salaryHistory,
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("project_phases").select("*").order("start_date"),
    supabase.from("allocations").select("*").order("start_date"),
    supabase
      .from("operating_expenses")
      .select("*")
      .order("spent_date", { ascending: false }),
    supabase
      .from("project_payments")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("salary_history")
      .select("*")
      .order("effective_from", { ascending: false }),
  ]);

  return {
    profiles: (profiles.data ?? []) as Profile[],
    projects: (projects.data ?? []) as Project[],
    phases: (phases.data ?? []) as ProjectPhase[],
    allocations: (allocations.data ?? []) as Allocation[],
    expenses: (expenses.data ?? []) as OperatingExpense[],
    payments: (payments.data ?? []) as ProjectPayment[],
    salaryHistory: (salaryHistory.data ?? []) as SalaryHistory[],
  };
}

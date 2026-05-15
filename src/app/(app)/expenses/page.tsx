import { fetchAll } from "@/lib/data";
import { ExpensesClient } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const { projects, expenses } = await fetchAll();
  return <ExpensesClient projects={projects} initialExpenses={expenses} />;
}

import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import { scopeBootstrapData } from "@/lib/data-scope";
import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPayment,
  ProjectPhase,
  SalaryHistory,
} from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/bootstrap — data đã scope theo role + strip lương/tiền nhạy cảm.
 * Dùng service role để đọc đủ, rồi lọc trước khi trả client.
 */
export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  const [
    profilesRes,
    projectsRes,
    phasesRes,
    allocationsRes,
    expensesRes,
    paymentsRes,
    salaryRes,
  ] = await Promise.all([
    ctx.admin.from("profiles").select("*").order("created_at", { ascending: false }),
    ctx.admin.from("projects").select("*").order("created_at", { ascending: false }),
    ctx.admin.from("project_phases").select("*").order("start_date"),
    ctx.admin.from("allocations").select("*").order("start_date"),
    ctx.admin.from("operating_expenses").select("*").order("spent_date", { ascending: false }),
    ctx.admin.from("project_payments").select("*").order("due_date"),
    ctx.role === "admin"
      ? ctx.admin
          .from("salary_history")
          .select("*")
          .order("effective_from", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError =
    profilesRes.error ||
    projectsRes.error ||
    phasesRes.error ||
    allocationsRes.error ||
    expensesRes.error ||
    paymentsRes.error ||
    salaryRes.error;

  if (firstError) {
    const msg = firstError.message ?? "db_error";
    const invalidKey = /invalid api key/i.test(msg);
    return NextResponse.json(
      {
        error: "db_error",
        message: invalidKey
          ? "Invalid API key — kiểm tra Vercel env: SUPABASE_SERVICE_ROLE_KEY phải là service_role (secret) của ĐÚNG project trong NEXT_PUBLIC_SUPABASE_URL. Không dùng anon/publishable. Sau khi sửa → Redeploy."
          : msg,
      },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  const payload = scopeBootstrapData({
    role: ctx.role,
    userId: ctx.user.id,
    email: ctx.user.email ?? null,
    profiles: (profilesRes.data ?? []) as Profile[],
    projects: (projectsRes.data ?? []) as Project[],
    phases: (phasesRes.data ?? []) as ProjectPhase[],
    allocations: (allocationsRes.data ?? []) as Allocation[],
    expenses: (expensesRes.data ?? []) as OperatingExpense[],
    payments: (paymentsRes.data ?? []) as ProjectPayment[],
    salaryHistory: (salaryRes.data ?? []) as SalaryHistory[],
  });

  return NextResponse.json(payload, { headers: PRIVATE_CACHE_HEADERS });
}

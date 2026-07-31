import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import { canViewMoney, canViewSalary } from "@/lib/rbac";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  return NextResponse.json(
    {
      id: ctx.user.id,
      email: ctx.user.email ?? null,
      role: ctx.role,
      isAdmin: ctx.isAdmin,
      canViewSalary: canViewSalary(ctx.role),
      canViewMoney: canViewMoney(ctx.role),
      full_name: ctx.profile.full_name,
      job_role: ctx.profile.job_role,
    },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}

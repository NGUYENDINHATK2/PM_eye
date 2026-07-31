import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import { scopeAllocations } from "@/lib/scope-query";
import type { Allocation } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  // Service role + scope — member chỉ thấy plan của mình
  const { data, error } = await ctx.admin
    .from("allocations")
    .select("*")
    .order("start_date");

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  const rows = scopeAllocations(
    (data ?? []) as Allocation[],
    ctx.role,
    ctx.user.id
  );

  // PM: chỉ allocation thuộc dự án mình phụ trách
  if (ctx.role === "pm") {
    const { data: projects } = await ctx.admin
      .from("projects")
      .select("id")
      .eq("manager_id", ctx.user.id);
    const ids = new Set((projects ?? []).map((p) => p.id as string));
    return NextResponse.json(
      rows.filter((a) => ids.has(a.project_id)),
      { headers: PRIVATE_CACHE_HEADERS }
    );
  }

  return NextResponse.json(rows, { headers: PRIVATE_CACHE_HEADERS });
}

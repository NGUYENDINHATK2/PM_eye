import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import { filterProjectsForRole, stripProjectMoney } from "@/lib/rbac";
import type { Allocation, Project } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  const [{ data, error }, allocRes] = await Promise.all([
    ctx.admin.from("projects").select("*").order("created_at", { ascending: false }),
    ctx.admin.from("allocations").select("user_id, project_id"),
  ]);

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  const allocated = new Set(
    ((allocRes.data ?? []) as Pick<Allocation, "user_id" | "project_id">[])
      .filter((a) => a.user_id === ctx.user.id)
      .map((a) => a.project_id)
  );

  const scoped = filterProjectsForRole(
    (data ?? []) as Project[],
    ctx.role,
    ctx.user.id,
    allocated
  ).map((p) => stripProjectMoney(p, ctx.role));

  return NextResponse.json(scoped, { headers: PRIVATE_CACHE_HEADERS });
}

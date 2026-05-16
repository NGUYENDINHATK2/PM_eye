import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import type { Project } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects
 * Trả danh sách dự án. Non-admin: redact tài chính (revenue, total_budget,
 * consumed_before, mm_rate) để tránh lộ giá khách.
 */
export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  const projects = (data ?? []) as Project[];
  const redacted = ctx.isAdmin
    ? projects
    : projects.map((p) => ({
        ...p,
        revenue: 0,
        total_budget: 0,
        consumed_before: 0,
        mm_rate: 0,
      }));

  return NextResponse.json(redacted, { headers: PRIVATE_CACHE_HEADERS });
}

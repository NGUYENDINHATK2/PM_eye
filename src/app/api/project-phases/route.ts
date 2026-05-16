import { PRIVATE_CACHE_HEADERS, requireApiAdmin } from "@/lib/api-auth";
import type { ProjectPhase } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/project-phases — admin only. */
export async function GET() {
  const ctx = await requireApiAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("project_phases")
    .select("*")
    .order("start_date");

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  return NextResponse.json((data ?? []) as ProjectPhase[], {
    headers: PRIVATE_CACHE_HEADERS,
  });
}

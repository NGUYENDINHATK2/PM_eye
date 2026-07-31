import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireApiUser();
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

  const rows =
    ctx.role === "member"
      ? (data ?? []).map((ph) => ({ ...ph, phase_budget: 0 }))
      : data ?? [];

  return NextResponse.json(rows, { headers: PRIVATE_CACHE_HEADERS });
}

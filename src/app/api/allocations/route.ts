import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  // Client nên dùng /api/bootstrap; endpoint này trả raw qua user RLS
  const { data, error } = await ctx.supabase
    .from("allocations")
    .select("*")
    .order("start_date");

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  return NextResponse.json(data ?? [], { headers: PRIVATE_CACHE_HEADERS });
}
